import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDuration } from '@/lib/format';
import type { Album, SongWithAlbum } from '@/types/database';

interface SearchParams {
  q?: string;
  filter?: 'missing-spotify' | 'missing-apple' | 'all';
}

export default async function AdminSongsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? '';
  const filter = searchParams.filter ?? 'all';

  let query = supabase.from('songs').select('*, album:albums(*), setlist_items(count)').order('title');

  if (q) query = query.ilike('title', `%${q}%`);
  if (filter === 'missing-spotify') query = query.is('spotify_track_id', null);
  if (filter === 'missing-apple') query = query.is('apple_music_url', null);

  const [{ data: songs }, { data: albums }] = await Promise.all([
    query.returns<(SongWithAlbum & { setlist_items: { count: number }[] })[]>(),
    supabase.from('albums').select('*').returns<Album[]>()
  ]);

  const allSongs = songs ?? [];
  const isSearching = Boolean(q) || filter !== 'all';

  // 依專輯分組：一般專輯依發行日期新到舊排列，Cover 作品固定放最後，
  // 沒有指定專輯的歌曲另外歸在「未分類」，同樣放最後。
  const regularAlbums = (albums ?? [])
    .filter((a) => !a.is_cover)
    .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''));
  const coverAlbums = (albums ?? []).filter((a) => a.is_cover);
  const orderedAlbums = [...regularAlbums, ...coverAlbums];

  function songsInAlbum(albumId: string) {
    return allSongs
      .filter((s) => s.album_id === albumId)
      .sort((a, b) => (a.track_number ?? 999) - (b.track_number ?? 999) || a.title.localeCompare(b.title, 'zh-Hant'));
  }

  const unclassified = allSongs
    .filter((s) => !s.album_id)
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant'));

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-stone-900">歌曲資料庫</h1>
        <div className="flex gap-2">
          <Link href="/admin/albums" className="admin-btn-secondary">管理專輯</Link>
          <Link href="/admin/songs/new" className="admin-btn">+ 新增歌曲</Link>
        </div>
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

      {isSearching ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
          <SongTable songs={allSongs} showAlbumColumn />
          {allSongs.length === 0 && (
            <p className="p-6 text-center text-sm text-stone-500">找不到符合條件的歌曲。</p>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {orderedAlbums.map((album) => {
            const albumSongs = songsInAlbum(album.id);
            if (albumSongs.length === 0) return null;
            return (
              <section key={album.id}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="font-display text-lg font-bold text-stone-900">{album.title}</h2>
                  {album.is_cover && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      Cover 作品
                    </span>
                  )}
                  {album.release_date && (
                    <span className="text-xs text-stone-400">{album.release_date}</span>
                  )}
                </div>
                <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <SongTable songs={albumSongs} showTrackNumber />
                </div>
              </section>
            );
          })}

          {unclassified.length > 0 && (
            <section>
              <h2 className="mb-2 font-display text-lg font-bold text-stone-500">未分類</h2>
              <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                <SongTable songs={unclassified} />
              </div>
            </section>
          )}

          {allSongs.length === 0 && (
            <p className="rounded-lg border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
              還沒有建立任何歌曲。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SongTable({
  songs,
  showAlbumColumn,
  showTrackNumber
}: {
  songs: (SongWithAlbum & { setlist_items?: { count: number }[] })[];
  showAlbumColumn?: boolean;
  showTrackNumber?: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
        <tr>
          {showTrackNumber && <th className="px-4 py-3 w-12">曲序</th>}
          <th className="px-4 py-3">歌名</th>
          {showAlbumColumn && <th className="px-4 py-3">專輯</th>}
          <th className="px-4 py-3">時長</th>
          <th className="px-4 py-3">Spotify</th>
          <th className="px-4 py-3">Apple Music</th>
          <th className="px-4 py-3">使用次數</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {songs.map((song) => (
          <tr key={song.id} className="hover:bg-stone-50">
            {showTrackNumber && (
              <td className="px-4 py-3 text-stone-400">{song.track_number ?? '—'}</td>
            )}
            <td className="px-4 py-3">
              <Link href={`/admin/songs/${song.id}`} className="font-medium text-stone-900 hover:underline">
                {song.title}
              </Link>
            </td>
            {showAlbumColumn && (
              <td className="px-4 py-3 text-stone-500">{song.album?.title ?? '未分類'}</td>
            )}
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
  );
}
