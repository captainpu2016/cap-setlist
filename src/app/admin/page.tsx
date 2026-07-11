import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatShowDate } from '@/lib/format';

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const { data: recentShows } = await supabase
    .from('shows')
    .select('*')
    .order('show_date', { ascending: false })
    .limit(6);

  const { data: songsMissingLinks } = await supabase
    .from('songs')
    .select('id, title, spotify_track_id, apple_music_url')
    .or('spotify_track_id.is.null,apple_music_url.is.null')
    .limit(8);

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
