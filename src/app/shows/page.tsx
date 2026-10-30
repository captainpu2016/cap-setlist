import { createPublicClient } from '@/lib/supabase/public';
import type { Show } from '@/types/database';
import { formatShowDateShort } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import JsonLd from '@/components/JsonLd';
import { breadcrumbJsonLd, getSiteUrl } from '@/lib/seo';

export const revalidate = 60;

export const metadata = {
  alternates: { canonical: '/shows' },
  title: '全部場次｜普通隊長',
  description: '普通隊長歷年演出場次列表，依年份整理。'
};

export default async function ShowsListPage() {
  const supabase = createPublicClient();
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

  const url = getSiteUrl();
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '普通隊長 全部演出場次',
    url: `${url}/shows`,
    inLanguage: 'zh-Hant-TW',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allShows.length,
      itemListElement: allShows.map((show, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${url}/show/${show.slug}`,
        name: show.title
      }))
    }
  };

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={[listJsonLd, breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '全部場次', path: '/shows' }])]} />
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
              <h2 className="section-title mb-3 font-accent text-2xl tracking-wider">{year}</h2>
              <ul className="divide-y divide-stage-700 border-2 border-stage-700 bg-stage-900">
                {(groups.get(year) ?? []).map((show) => (
                  <li key={show.id}>
                    <a
                      href={`/show/${show.slug}`}
                      className="flex flex-col gap-1 px-4 py-3 text-sm transition-colors hover:bg-stage-800 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-4"
                    >
                      <span className="min-w-0 break-words text-paper">{show.title}</span>
                      <span className="min-w-0 break-words text-xs text-stone-500 sm:max-w-[45%] sm:shrink-0 sm:text-right">
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
