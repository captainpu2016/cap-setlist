'use client';

import { useState, useTransition } from 'react';
import { updateShowInfo, deleteShow } from '../../actions';
import type { Show } from '@/types/database';

type SaveState = 'idle' | 'saved' | 'error';

export default function ShowInfoForm({ show }: { show: Show }) {
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
        <label className="admin-label" htmlFor="venue">場地</label>
        <input id="venue" name="venue" defaultValue={show.venue ?? ''} className="admin-input" />
      </div>

      <div>
        <label className="admin-label" htmlFor="slug">網址代稱（slug）</label>
        <input id="slug" name="slug" defaultValue={show.slug} required className="admin-input" />
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