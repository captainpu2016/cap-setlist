import { createPublicClient } from '@/lib/supabase/public';
import type { Show } from '@/types/database';
import { formatShowDateShort } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import JsonLd from '@/components/JsonLd';
import { breadcrumbJsonLd, getSiteUrl } from '@/lib/seo';
import ShowsExplorer from './shows-explorer';

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

        {error ? (
          <p className="mt-10 text-sm text-signal">讀取場次時發生錯誤：{error.message}</p>
        ) : allShows.length === 0 ? (
          <p className="mt-10 text-sm text-stone-500">還沒有上架的場次。</p>
        ) : (
          <ShowsExplorer
            shows={allShows.map((s) => ({
              id: s.id,
              slug: s.slug,
              title: s.title,
              date: s.show_date,
              dateLabel: formatShowDateShort(s.show_date),
              venue: s.venue,
              category: s.category ?? null,
              series: s.series ?? null
            }))}
          />
        )}
      </div>
    </main>
  );
}
