import { createClient } from '@/lib/supabase/server';
import { formatShowDateShort } from '@/lib/format';
import type { Show, Song } from '@/types/database';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const metadata = {
  title: '搜尋歌曲｜普通隊長',
  description: '搜尋普通隊長的歌曲，找出在哪些場次唱過。'
};

interface SetlistItemJoined {
  id: string;
  is_placeholder: boolean;
  show: Show | null;
}

interface SongResult extends Song {
  setlist_items: SetlistItemJoined[];
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() ?? '';
  const supabase = createClient();

  let results: SongResult[] = [];
  if (q) {
    const { data } = await supabase
      .from('songs')
      .select('*, setlist_items(id, is_placeholder, show:shows(*))')
      .ilike('title', `%${q}%`)
      .order('title')
      .returns<SongResult[]>();
    results = data ?? [];
  }

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <BackLink />

        <div className="mt-6">
          <PageHeader eyebrow="Search" title="搜尋歌曲" description="找找看某首歌在哪些場次唱過。" />
        </div>

        <form method="get" className="mt-8 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="輸入歌名關鍵字…"
            autoFocus
            className="flex-1 rounded-md border border-stage-700 bg-stage-900/60 px-4 py-2.5 text-sm text-paper placeholder:text-stone-600 focus:border-marquee focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-marquee px-5 py-2.5 text-sm font-bold text-stage-950 transition hover:bg-marquee/80"
          >
            搜尋
          </button>
        </form>

        <div className="mt-10">
          {!q && <p className="text-sm text-stone-500">輸入歌名開始搜尋。</p>}

          {q && results.every((song) => !hasVisibleShows(song)) && (
            <p className="text-sm text-stone-500">沒有找到符合「{q}」的歌曲。</p>
          )}

          {results.map((song) => {
            const shows = (song.setlist_items ?? [])
              .filter((i) => !i.is_placeholder && i.show)
              .map((i) => i.show as Show)
              .sort((a, b) => b.show_date.localeCompare(a.show_date));

            if (shows.length === 0) return null;

            return (
              <div key={song.id} className="mb-8">
                <h2 className="font-display text-lg font-bold text-paper">{song.title}</h2>
                <p className="mb-2 text-xs text-stone-500">在 {shows.length} 場演出中唱過</p>
                <ul className="divide-y divide-stage-700 rounded-lg border border-stage-700 bg-stage-900/60">
                  {shows.map((show) => (
                    <li key={show.id}>
                      <a
                        href={`/show/${show.slug}`}
                        className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-stage-800/60"
                      >
                        <span className="text-paper">{show.title}</span>
                        <span className="text-xs text-stone-500">{formatShowDateShort(show.show_date)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function hasVisibleShows(song: SongResult): boolean {
  return (song.setlist_items ?? []).some((i) => !i.is_placeholder && i.show);
}
