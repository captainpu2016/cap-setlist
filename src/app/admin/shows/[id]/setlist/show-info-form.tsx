'use client';

import { useState, useTransition } from 'react';
import { updateShowInfo, deleteShow } from '../../actions';
import type { Show, Venue } from '@/types/database';

type SaveState = 'idle' | 'saved' | 'error';

/** 把資料庫存的 ISO 時間字串轉成 <input type="datetime-local"> 要的本地時間格式 */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ShowInfoForm({ show, venues }: { show: Show; venues: Venue[] }) {
  const [status, setStatus] = useState(show.status);
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>('idle');

  function handleSubmit(formData: FormData) {
    setSaveState('idle');
    startTransition(async () => {
      try {
        await updateShowInfo(formData);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2500);
      } catch {
        setSaveState('error');
      }
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2">
      <input type="hidden" name="id" value={show.id} />

      <div>
        <label className="admin-label" htmlFor="title">場次名稱</label>
        <input id="title" name="title" defaultValue={show.title} required className="admin-input" />
      </div>

      <div>
        <label className="admin-label" htmlFor="show_date">演出日期</label>
        <input id="show_date" name="show_date" type="date" defaultValue={show.show_date} required className="admin-input" />
      </div>

      <div>
        <label className="admin-label" htmlFor="venue_id">場地</label>
        <select id="venue_id" name="venue_id" defaultValue={show.venue_id ?? ''} className="admin-input">
          <option value="">未指定</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.city ? `${v.city} ${v.name}` : v.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-400">
          找不到想要的場地？<a href="/admin/venues/new" className="underline hover:text-stone-600">先去新增一個場地</a>，回來這裡重新整理就會出現在選單裡。
        </p>
      </div>

      <div>
        <label className="admin-label" htmlFor="slug">網址代稱（slug）</label>
        <input id="slug" name="slug" defaultValue={show.slug} required className="admin-input" />
      </div>

      <div className="sm:col-span-2">
        <label className="admin-label" htmlFor="cover_image_url">封面圖片網址（選填）</label>
        <input
          id="cover_image_url"
          name="cover_image_url"
          defaultValue={show.cover_image_url ?? ''}
          className="admin-input"
          placeholder="https://xxxxxxxxxxxx.supabase.co/storage/v1/object/public/..."
        />
        <p className="mt-1 text-xs text-stone-400">
          先到 Supabase Dashboard 左側「Storage」上傳這場演出的照片，複製公開網址貼在這裡。留空則不顯示。
        </p>
        {show.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={show.cover_image_url}
            alt="目前的封面圖片預覽"
            className="mt-3 h-32 w-full rounded-md border border-stone-200 object-cover"
          />
        )}
      </div>

      <div className="sm:col-span-2">
        <label className="admin-label" htmlFor="setlist_reveal_at">歌單公開時間（選填）</label>
        <input
          id="setlist_reveal_at"
          name="setlist_reveal_at"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(show.setlist_reveal_at)}
          className="admin-input"
        />
        <p className="mt-1 text-xs text-stone-400">
          留空＝場次一上架，歌單就會立刻顯示。設定時間的話，場次頁在那之前會先顯示「敬請期待」，
          不會提前曝光歌單內容（例如避免下一場的曲目被提前看到）。
        </p>
      </div>

      <div className="sm:col-span-2">
        <span className="admin-label">上架狀態</span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="radio"
              name="status"
              value="draft"
              checked={status === 'draft'}
              onChange={() => setStatus('draft')}
            />
            草稿（前台不可見）
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="radio"
              name="status"
              value="published"
              checked={status === 'published'}
              onChange={() => setStatus('published')}
            />
            已上架
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={isPending} className="admin-btn">
          {isPending ? '儲存中…' : '儲存場次資料'}
        </button>

        {saveState === 'saved' && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <span aria-hidden>✓</span> 已儲存
          </span>
        )}
        {saveState === 'error' && (
          <span className="text-sm text-red-600">儲存失敗，請再試一次</span>
        )}

        <button
          type="submit"
          formAction={deleteShow}
          className="admin-btn-danger ml-auto"
          onClick={(e) => {
            if (!confirm('確定要刪除這個場次嗎？歌單資料也會一併刪除，此動作無法復原。')) e.preventDefault();
          }}
        >
          刪除場次
        </button>
      </div>
    </form>
  );
}
