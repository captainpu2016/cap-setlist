'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addSetlistItem, removeSetlistItem, reorderSetlistItems, updateSetlistItemNotes } from '../../actions';
import { formatDuration } from '@/lib/format';
import type { SetlistItemWithSong, Song } from '@/types/database';

interface SongWithUsage extends Song {
  usageCount: number;
}

type SaveIndicator = 'idle' | 'saving' | 'saved';

export default function SetlistEditor({
  showId,
  initialItems,
  songLibrary
}: {
  showId: string;
  initialItems: SetlistItemWithSong[];
  songLibrary: SongWithUsage[];
}) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [saveIndicator, setSaveIndicator] = useState<SaveIndicator>('idle');
  const wasPending = useRef(false);

  // isPending 從 true 變回 false 時，代表一次儲存動作剛完成，
  // 短暫顯示「已儲存」再淡出，讓管理者清楚知道系統有反應。
  useEffect(() => {
    if (isPending) {
      wasPending.current = true;
      setSaveIndicator('saving');
    } else if (wasPending.current) {
      wasPending.current = false;
      setSaveIndicator('saved');
      const timer = setTimeout(() => setSaveIndicator('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isPending]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const usedSongIds = new Set(items.map((i) => i.song_id).filter(Boolean));

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? songLibrary.filter((s) => s.title.toLowerCase().includes(q)) : songLibrary;
    return [...pool].sort((a, b) => b.usageCount - a.usageCount).slice(0, 8);
  }, [query, songLibrary]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      startTransition(() => {
        reorderSetlistItems(showId, next.map((i) => i.id));
      });
      return next;
    });
  }

  async function handleAddSong(song: SongWithUsage) {
    const fd = new FormData();
    fd.set('show_id', showId);
    fd.set('song_id', song.id);
    fd.set('is_placeholder', '0');
    startTransition(async () => {
      await addSetlistItem(fd);
      setItems((prev) => [
        ...prev,
        {
          id: `optimistic-${Date.now()}`,
          show_id: showId,
          song_id: song.id,
          position: prev.length,
          notes: null,
          is_placeholder: false,
          created_at: new Date().toISOString(),
          song
        }
      ]);
    });
    setQuery('');
  }

  async function handleAddPlaceholder() {
    const fd = new FormData();
    fd.set('show_id', showId);
    fd.set('is_placeholder', '1');
    startTransition(async () => {
      await addSetlistItem(fd);
      setItems((prev) => [
        ...prev,
        {
          id: `optimistic-${Date.now()}`,
          show_id: showId,
          song_id: null,
          position: prev.length,
          notes: null,
          is_placeholder: true,
          created_at: new Date().toISOString(),
          song: null
        }
      ]);
    });
  }

  async function handleRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const fd = new FormData();
    fd.set('id', id);
    fd.set('show_id', showId);
    startTransition(() => {
      removeSetlistItem(fd);
    });
  }

  async function handleNotesBlur(id: string, notes: string) {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('show_id', showId);
    fd.set('notes', notes);
    startTransition(() => {
      updateSetlistItemNotes(fd);
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <p className="admin-label">從歌曲庫選曲</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋歌名…"
          className="admin-input"
        />
        <ul className="mt-2 max-h-80 overflow-y-auto rounded-md border border-stone-200 bg-white">
          {suggestions.map((song) => (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => handleAddSong(song)}
                disabled={usedSongIds.has(song.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>{song.title}</span>
                <span className="text-xs text-stone-400">{song.usageCount} 場</span>
              </button>
            </li>
          ))}
          {suggestions.length === 0 && <li className="px-3 py-2 text-sm text-stone-400">找不到符合的歌曲</li>}
        </ul>

        <button type="button" onClick={handleAddPlaceholder} className="admin-btn-secondary mt-4 w-full">
          + 加入「未定曲目」佔位
        </button>
        <a href="/admin/songs/new" className="mt-2 block text-center text-xs text-stone-400 hover:underline">
          歌曲庫沒有這首歌？先去新增
        </a>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="admin-label">目前歌單（{items.length} 首，可拖曳排序）</p>
          <SaveIndicatorBadge state={saveIndicator} />
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <SetlistRow
                  key={item.id}
                  item={item}
                  index={idx}
                  onRemove={() => handleRemove(item.id)}
                  onNotesBlur={(notes) => handleNotesBlur(item.id, notes)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {items.length === 0 && (
          <p className="rounded-md border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400">
            從左側選曲加入歌單。
          </p>
        )}
      </div>
    </div>
  );
}

function SaveIndicatorBadge({ state }: { state: SaveIndicator }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-stone-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400" />
        儲存中…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 transition-opacity">
        <span aria-hidden>✓</span> 已儲存
      </span>
    );
  }
  return null;
}

function SetlistRow({
  item,
  index,
  onRemove,
  onNotesBlur
}: {
  item: SetlistItemWithSong;
  index: number;
  onRemove: () => void;
  onNotesBlur: (notes: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab select-none px-1 text-stone-300 hover:text-stone-500"
        aria-label="拖曳排序"
      >
        ⠿
      </button>
      <span className="w-5 shrink-0 text-xs text-stone-400">{index + 1}</span>

      <div className="min-w-0 flex-1">
        {item.is_placeholder ? (
          <p className="text-sm italic text-stone-500">未定曲目（敬請期待）</p>
        ) : (
          <p className="truncate text-sm font-medium text-stone-900">{item.song?.title}</p>
        )}
        <input
          defaultValue={item.notes ?? ''}
          placeholder="備註，例如：安可曲"
          onBlur={(e) => onNotesBlur(e.target.value)}
          className="mt-1 w-full border-none bg-transparent p-0 text-xs text-stone-400 focus:outline-none"
        />
      </div>

      {!item.is_placeholder && (
        <span className="shrink-0 text-xs text-stone-400">
          {formatDuration(item.song?.duration_seconds) ?? ''}
        </span>
      )}

      <button type="button" onClick={onRemove} className="shrink-0 text-xs text-stone-400 hover:text-red-600">
        移除
      </button>
    </li>
  );
}