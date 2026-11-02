import { createPublicClient } from '@/lib/supabase/public';
import type { Show, Venue } from '@/types/database';
import { getCity, todayTaipei } from '@/lib/format';
import { getShowCoordinates } from '@/lib/geo';
import TourView, { type TourShow } from './tour-view';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import JsonLd from '@/components/JsonLd';
import MonthlyHeatmap from './monthly-heatmap';
import { breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 3600;

export const metadata = {
  alternates: { canonical: '/tour' },
  title: '巡演足跡｜普通隊長',
  description: '普通隊長歷年演出地點地圖、移動路線，以及逐月演出場次趨勢。'
};

type ShowWithVenue = Show & { venue_data: Venue | null };

/** 從最早一場到最新一場，逐月排開，沒有演出的月份也會列出（計數 0），才看得出巡演節奏跟空窗期 */
function buildMonthlyTimeline(shows: Show[]): { yearMonth: string; count: number }[] {
  if (shows.length === 0) return [];
  const dates = shows.map((s) => s.show_date).sort();
  const [startY, startM] = dates[0].slice(0, 7).split('-').map(Number);
  const [endY, endM] = dates[dates.length - 1].slice(0, 7).split('-').map(Number);

  const counts = new Map<string, number>();
  for (const s of shows) {
    const ym = s.show_date.slice(0, 7);
    counts.set(ym, (counts.get(ym) ?? 0) + 1);
  }

  const timeline: { yearMonth: string; count: number }[] = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    timeline.push({ yearMonth: key, count: counts.get(key) ?? 0 });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return timeline;
}

export default async function TourPage() {
  const supabase = createPublicClient();
  const { data: shows } = await supabase
    .from('shows')
    .select('*, venue_data:venues(*)')
    .eq('status', 'published')
    .returns<ShowWithVenue[]>();

  const allShows = shows ?? [];

  // 轉成巡演頁用的精簡資料（座標優先用場地自己的經緯度；沒有座標的場次不畫在地圖上，但仍計入統計）
  const tourShows: TourShow[] = allShows.map((show) => {
    const coords = getShowCoordinates(show, show.venue_data);
    const city = show.venue_data?.city ?? getCity(show.venue) ?? null;
    const venueName = show.venue_data?.name ?? show.venue ?? '未知場地';
    return {
      date: show.show_date,
      title: show.title,
      venue: show.venue,
      venueName,
      venueKey: `${city ?? ''}__${venueName}`,
      lat: coords ? coords[0] : null,
      lng: coords ? coords[1] : null,
      venueType: show.venue_data?.venue_type ?? null
    };
  });

  const uncounted = tourShows.filter((s) => s.lat == null).length;
  const cityTotal = new Set(allShows.map((s) => getCity(s.venue)).filter(Boolean)).size;
  const monthlyTimeline = buildMonthlyTimeline(allShows);

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '巡演足跡', path: '/tour' }])} />
      <div className="mx-auto max-w-5xl">
        <BackLink />

        <div className="mt-6">
          <PageHeader
            eyebrow="Tour Archive"
            title="巡演足跡"
            description={`${allShows.length} 場演出，走過 ${cityTotal} 個城市${
              uncounted > 0 ? `（另有 ${uncounted} 場還沒有定位資料，不會顯示在地圖上）` : ''
            }`}
          />
        </div>

        <TourView shows={tourShows}>
          <section className="mt-14">
            <h2 className="section-title mb-1 text-xl">逐月演出趨勢</h2>
            <p className="mb-4 text-sm text-stone-500">看的是整個歷史，不受上方期間篩選影響。</p>
            {monthlyTimeline.length > 0 ? (
              <MonthlyHeatmap timeline={monthlyTimeline} currentYearMonth={todayTaipei().slice(0, 7)} />
            ) : (
              <p className="text-sm text-stone-500">還沒有演出資料。</p>
            )}
          </section>
        </TourView>
      </div>
    </main>
  );
}
