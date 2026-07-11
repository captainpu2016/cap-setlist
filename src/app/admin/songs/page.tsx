import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDuration } from '@/lib/format';
import type { Song } from '@/types/database';

type SongWithUsage = Song & { setlist_items: { count: number }[] };

interface SearchParams {
  q?: string;
  filter?: 'missing-spotify' | 'missing-apple' | 'all';
}

export default async function AdminSongsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? '';
  const filter = searchParams.filter ?? 'all';

  let query = supabase.from('songs').select('*, setlist_items(count)').order('title');

  if (q) query = query.ilike('title', `%${q}%`);
  if (filter === 'missing-spotify') query = query.is('spotify_track_id', null);
  if (filter === 'missing-apple') query = query.is('apple_music_url', null);

const { data: songs } = await query.returns<SongWithUsage[]>();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-stone-900">歌曲資料庫</h1>
        <Link href="/admin/songs/new" className="admin-btn">
          + 新增歌曲
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="搜尋歌名…"
          className="admin-input max-w-xs"
        />
        <select name="filter" defaultValue={filter} className="admin-input max-w-[10rem]">
          <option value="all">全部</option>
          <option value="missing-spotify">缺 Spotify</option>
          <option value="missing-apple">缺 Apple Music</option>
        </select>
        <button type="submit" className="admin-btn-secondary">套用</button>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">歌名</th>
              <th className="px-4 py-3">時長</th>
              <th className="px-4 py-3">Spotify</th>
              <th className="px-4 py-3">Apple Music</th>
              <th className="px-4 py-3">使用次數</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(songs ?? []).map((song: any) => (
              <tr key={song.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/songs/${song.id}`} className="font-medium text-stone-900 hover:underline">
                    {song.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-500">{formatDuration(song.duration_seconds) ?? '—'}</td>
                <td className="px-4 py-3">
                  {song.spotify_track_id ? (
                    <span className="text-green-600">已連結</span>
                  ) : (
                    <span className="text-stone-400">未連結</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {song.apple_music_url ? (
                    <span className="text-green-600">已連結</span>
                  ) : (
                    <span className="text-stone-400">未連結</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-500">{song.setlist_items?.[0]?.count ?? 0} 場</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(songs ?? []).length === 0 && (
          <p className="p-6 text-center text-sm text-stone-500">找不到符合條件的歌曲。</p>
        )}
      </div>
    </div>
  );
}
