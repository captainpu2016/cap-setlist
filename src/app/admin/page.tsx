import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatShowDate } from '@/lib/format';
import type { Show, Song } from '@/types/database';

type SongMissingLink = Pick<Song, 'id' | 'title' | 'spotify_track_id' | 'apple_music_url'>;

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const { data: recentShows } = await supabase
    .from('shows')
    .select('*')
    .order('show_date', { ascending: false })
    .limit(6)
    .returns<Show[]>();

  const { data: songsMissingLinks } = await supabase
    .from('songs')
    .select('id, title, spotify_track_id, apple_music_url')
    .or('spotify_track_id.is.null,apple_music_url.is.null')
    .limit(8)
    .returns<SongMissingLink[]>();

  // 留言資料表還沒建立時查詢會出錯，這時就不顯示留言提醒
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [recentComments, reportedComments] = await Promise.all([
    supabase.from('show_comments').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('show_comments').select('*', { count: 'exact', head: true }).gt('report_count', 0)
  ]);
  const commentsReady = !recentComments.error;

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-stone-900">後台總覽</h1>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">近期場次</h2>
          <Link href="/admin/shows" className="text-sm text-stone-600 hover:underline">
            查看全部 →
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {(recentShows ?? []).length === 0 && (
            <p className="p-4 text-sm text-stone-500">還沒有建立任何場次。</p>
          )}
          <ul className="divide-y divide-stone-100">
            {(recentShows ?? []).map((show) => (
              <li key={show.id}>
                <Link
                  href={`/admin/shows/${show.id}/setlist`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-stone-50"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">{show.title}</p>
                    <p className="text-xs text-stone-500">{formatShowDate(show.show_date)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      show.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {show.status === 'published' ? '已上架' : '草稿'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {commentsReady && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">留言</h2>
          <Link
            href="/admin/comments"
            className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 hover:bg-stone-50"
          >
            <span className="text-sm text-stone-700">
              近 7 天新增 <strong>{recentComments.count ?? 0}</strong> 則留言
              {(reportedComments.count ?? 0) > 0 && (
                <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">{reportedComments.count} 則被檢舉</span>
              )}
            </span>
            <span className="text-sm text-stone-500">前往管理 →</span>
          </Link>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">資料備份</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white p-4">
          <p className="mr-auto text-sm text-stone-600">匯出全部場次與歌單（含草稿），建議定期備份一份。</p>
          <a href="/admin/export?format=csv" className="admin-btn-secondary">下載 CSV</a>
          <a href="/admin/export?format=json" className="admin-btn-secondary">下載 JSON</a>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          待補串流連結提醒
        </h2>
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {(songsMissingLinks ?? []).length === 0 && (
            <p className="p-4 text-sm text-stone-500">所有曲目串流連結都已補齊 🎉</p>
          )}
          <ul className="divide-y divide-stone-100">
            {(songsMissingLinks ?? []).map((song) => (
              <li key={song.id}>
                <Link
                  href={`/admin/songs/${song.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-stone-50"
                >
                  <span className="text-sm text-stone-900">{song.title}</span>
                  <span className="flex gap-1 text-xs text-stone-400">
                    {!song.spotify_track_id && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">缺 Spotify</span>}
                    {!song.apple_music_url && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">缺 Apple Music</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
