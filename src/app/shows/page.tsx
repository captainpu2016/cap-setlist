import { createClient } from '@/lib/supabase/server';
import type { Show } from '@/types/database';
import { formatShowDateShort } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const revalidate = 60;

export const metadata = {
  title: '全部場次｜普通隊長',
  description: '普通隊長歷年演出場次列表，依年份整理。'
};

export default async function ShowsListPage() {
  const supabase = createClient();
  const { data: shows, error } = await supabase
    .from('shows')
    .select('*')
    .eq('status', 'published')
    .order('show_date', { ascending: false })
    .returns<Show[]>();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[shows list] 查詢失敗', error);
  }

  const allShows = shows ?? [];

  const groups = new Map<string, Show[]>();
  for (const show of allShows) {
    const year = show.show_date.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(show);
  }
  const years = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <BackLink />

        <div className="mt-6">
          <PageHeader
            eyebrow="Archive"
            title="全部場次"
            description={allShows.length > 0 ? `依年份列出全部 ${allShows.length} 場演出。` : undefined}
          />
        </div>

        <div className="mt-10 space-y-10">
          {years.map((year) => (
            <section key={year}>
              <h2 className="mb-3 font-display text-lg font-bold text-marquee">{year}</h2>
              <ul className="divide-y divide-stage-700 rounded-lg border border-stage-700 bg-stage-900/60">
                {(groups.get(year) ?? []).map((show) => (
                  <li key={show.id}>
                    <a
                      href={`/show/${show.slug}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm transition-colors hover:bg-stage-800/60"
                    >
                      <span className="text-paper">{show.title}</span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {formatShowDateShort(show.show_date)}
                        {show.venue ? `・${show.venue}` : ''}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {error && (
            <p className="text-sm text-signal">
              讀取場次時發生錯誤：{error.message}
            </p>
          )}

          {!error && allShows.length === 0 && (
            <p className="text-sm text-stone-500">還沒有上架的場次。</p>
          )}
        </div>
      </div>
    </main>
  );
}
