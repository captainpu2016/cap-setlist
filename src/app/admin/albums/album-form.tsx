'use client';

import { useTransition } from 'react';
import { upsertAlbum, deleteAlbum } from './actions';
import type { Album } from '@/types/database';

export default function AlbumForm({ album }: { album?: Album }) {
  const isNew = !album;
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      upsertAlbum(formData);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-md space-y-5">
      <input type="hidden" name="id" value={album?.id ?? 'new'} />

      <div>
        <label className="admin-label" htmlFor="title">專輯名稱 *</label>
        <input id="title" name="title" required defaultValue={album?.title} className="admin-input" />
      </div>

      <div>
        <label className="admin-label" htmlFor="release_date">發行日期（選填）</label>
        <input
          id="release_date"
          name="release_date"
          type="date"
          defaultValue={album?.release_date ?? ''}
          className="admin-input"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" name="is_cover" value="1" defaultChecked={album?.is_cover ?? false} />
        這是「Cover 作品」分類（非普通隊長個人專輯的作品）
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className="admin-btn">
          {isPending ? '儲存中…' : isNew ? '新增專輯' : '儲存變更'}
        </button>
        <a href="/admin/albums" className="admin-btn-secondary">取消</a>
      </div>

      {!isNew && (
        <div className="border-t border-stone-200 pt-5">
          <p className="mb-2 text-xs text-stone-500">
            刪除專輯不會刪除歌曲，原本屬於這張專輯的歌曲會變回「未分類」。
          </p>
          <button
            type="submit"
            formAction={deleteAlbum}
            className="admin-btn-danger"
            onClick={(e) => {
              if (!confirm('確定要刪除這張專輯嗎？')) e.preventDefault();
            }}
          >
            刪除這張專輯
          </button>
        </div>
      )}
    </form>
  );
}
