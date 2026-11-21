import type { Metadata } from 'next';
import { todayTaipei } from '@/lib/format';
import { breadcrumbJsonLd } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import { getFilterShows, getStatsShows } from '@/lib/stats-shows';
import StatsShell from './stats-shell';
import StatsView from './stats-view';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '歌單統計｜普通隊長最常唱的歌、翻唱過的歌與每年歌單',
  description: '從歷年演出歌單統計：普通隊長最常演出的歌、曾經翻唱過的歌、每年平均歌單長度、最久沒唱的歌，以及只唱過一次的稀有歌曲。可依演出分類、海外、入場方式篩選。',
  alternates: { canonical: '/stats' }
};

export default async function StatsPage() {
  const [slim, filterShows] = await Promise.all([getStatsShows(), getFilterShows()]);

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '歌單統計', path: '/stats' }])} />
      <div className="mx-auto max-w-5xl">
        <StatsShell active="stats" description="把每一場的歌單加起來，看看普通隊長的現場到底都唱些什麼。" filterShows={filterShows}>
          <StatsView shows={slim} today={todayTaipei()} />
        </StatsShell>
      </div>
    </main>
  );
}
