'use client';

import { useTransition } from 'react';
import { upsertSong, deleteSong } from './actions';
import type { Song } from '@/types/database';

export default function SongForm({ song }: { song?: Song }) {
  const isNew = !song;
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      upsertSong(formData);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-xl space-y-5">
      <input type="hidden" name="id" value={song?.id ?? 'new'} />

      <div>
        <label className="admin-label" htmlFor="title">歌名 *</label>
        <input id="title" name="title" required defaultValue={song?.title} className="admin-input" />
      </div>

      <div>
        <label className="admin-label" htmlFor="duration_seconds">時長（秒）</label>
        <input
          id="duration_seconds"
          name="duration_seconds"
          type="number"
          min={0}
          defaultValue={song?.duration_seconds ?? ''}
          className="admin-input"
          placeholder="例：215"
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="spotify_input">Spotify 連結</label>
        <input
          id="spotify_input"
          name="spotify_input"
          defaultValue={song?.spotify_track_id ? `https://open.spotify.com/track/${song.spotify_track_id}` : ''}
          className="admin-input"
          placeholder="貼上 https://open.spotify.com/track/xxxx"
        />
        <p className="mt-1 text-xs text-stone-400">會自動解析並只儲存 track ID。</p>
      </div>

      <div>
        <label className="admin-label" htmlFor="dropbox_url">Dropbox 完整音檔連結</label>
        <input
          id="dropbox_url"
          name="dropbox_url"
          defaultValue={song?.dropbox_url ?? ''}
          className="admin-input"
          placeholder="https://www.dropbox.com/s/xxxx/song.mp3?dl=0"
        />
        <p className="mt-1 text-xs text-stone-400">
          前台歌單頁的線上播放（單首試聽、歌單播放）都是讀這個連結，貼 Dropbox 分享連結即可，不用自己改 dl=0/1。
        </p>
      </div>

      <div>
        <label className="admin-label" htmlFor="apple_music_url">Apple Music 連結</label>
        <input
          id="apple_music_url"
          name="apple_music_url"
          defaultValue={song?.apple_music_url ?? ''}
          className="admin-input"
          placeholder="https://music.apple.com/tw/album/.../..."
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="youtube_url">YouTube 連結（選填）</label>
        <input
          id="youtube_url"
          name="youtube_url"
          defaultValue={song?.youtube_url ?? ''}
          className="admin-input"
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className="admin-btn">
          {isPending ? '儲存中…' : isNew ? '新增歌曲' : '儲存變更'}
        </button>
        <a href="/admin/songs" className="admin-btn-secondary">取消</a>
      </div>

      {!isNew && (
        <div className="border-t border-stone-200 pt-5">
          <p className="mb-2 text-xs text-stone-500">
            刪除歌曲會一併移除它在所有歌單中的引用，請確認沒有正在使用中的場次仍需要這首歌。
          </p>
          <button
            type="submit"
            formAction={deleteSong}
            className="admin-btn-danger"
            onClick={(e) => {
              if (!confirm('確定要刪除這首歌嗎？此動作無法復原。')) e.preventDefault();
            }}
          >
            刪除這首歌
          </button>
        </div>
      )}
    </form>
  );
}
