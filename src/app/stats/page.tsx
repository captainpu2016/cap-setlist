import type { Metadata } from 'next';
import { getArchive } from '@/lib/archive';
import { todayTaipei } from '@/lib/format';
import { isOverseasVenue } from '@/lib/geo';
import { breadcrumbJsonLd } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import StatsView from './stats-view';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '歌單統計｜普通隊長最常唱的歌、翻唱過的歌與每年歌單',
  description: '從歷年演出歌單統計：普通隊長最常演出的歌、曾經翻唱過的歌、每年平均歌單長度、最久沒唱的歌，以及只唱過一次的稀有歌曲。可依演出分類、海外、入場方式篩選。',
  alternates: { canonical: '/stats' }
};

export default async function StatsPage() {
  const { shows } = await getArchive();
  // 只送統計需要的欄位到瀏覽器端
  const slim = shows.map((x) => ({
    id: x.id,
    slug: x.slug,
    title: x.title,
    date: x.date,
    venue: x.venue,
    category: x.category,
    series: x.series,
    admission: x.admission,
    overseas: isOverseasVenue(x.venue),
    songs: x.songs.map((song) => ({ id: song.id, title: song.title, isCover: song.isCover }))
  }));

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '歌單統計', path: '/stats' }])} />
      <div className="mx-auto max-w-3xl">
        <BackLink />
        <div className="mt-6">
          <PageHeader eyebrow="Stats" title="歌單統計" description="把每一場的歌單加起來，看看普通隊長的現場到底都唱些什麼。" />
        </div>
        <StatsView shows={slim} today={todayTaipei()} />
      </div>
    </main>
  );
}
