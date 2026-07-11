import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatShowDate } from '@/lib/format';
import type { Show } from '@/types/database';

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createClient();
  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .eq('status', 'published')
    .order('show_date', { ascending: false })
    .returns<Show[]>();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (shows ?? []).filter((s: Show) => s.show_date >= today).reverse();
  const past = (shows ?? []).filter((s: Show) => s.show_date < today);

  return (
    <main className="min-h-screen bg-noise">
      <header className="border-b border-stage-700/60 px-6 py-14 sm:px-10">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-marquee">Setlist Archive</p>
        <h1 className="mt-3 font-display text-4xl font-black leading-tight text-paper sm:text-6xl">
          普通隊長
          <span className="block text-2xl font-normal text-stone-400 sm:text-3xl">演出場次與歌單</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-400">
          瀏覽每一場演出的完整歌單，找到當天播了哪些歌，並可一鍵生成同名 Spotify 播放清單。
        </p>
      </header>

      <section className="px-6 py-10 sm:px-10">
        {upcoming.length > 0 && (
          <ShowGroup title="近期場次" shows={upcoming} accent />
        )}
        <ShowGroup title="歷史場次" shows={past} />

        {(shows ?? []).length === 0 && (
          <p className="py-20 text-center text-stone-500">目前還沒有上架的場次，敬請期待。</p>
        )}
      </section>
    </main>
  );
}

function ShowGroup({ title, shows, accent }: { title: string; shows: Show[]; accent?: boolean }) {
  if (shows.length === 0) return null;
  return (
    <div className="mb-12">
      <h2 className="mb-4 font-display text-lg font-bold text-stone-300">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shows.map((show) => (
          <li key={show.id}>
            <Link
              href={`/show/${show.slug}`}
              className={`group block h-full rounded-lg border p-5 transition ${
                accent
                  ? 'border-marquee/40 bg-stage-900 hover:border-marquee'
                  : 'border-stage-700 bg-stage-900/60 hover:border-stone-500'
              }`}
            >
              <p className="text-xs uppercase tracking-widest text-stone-500">
                {formatShowDate(show.show_date)}
              </p>
              <h3 className="mt-2 font-display text-xl font-bold text-paper group-hover:text-marquee">
                {show.title}
              </h3>
              {show.venue && <p className="mt-1 text-sm text-stone-400">{show.venue}</p>}
              {show.spotify_playlist_url && (
                <span className="mt-4 inline-block rounded-full bg-signal/20 px-3 py-1 text-xs text-signal">
                  已有播放清單
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
