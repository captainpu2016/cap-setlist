import { createPublicClient } from '@/lib/supabase/public';
import type { Show, Venue } from '@/types/database';
import { getCity, todayTaipei } from '@/lib/format';
import { countryOfVenue, distanceKm, venueGroupName } from '@/lib/geo';
import { BarRow } from '@/components/BarRow';
import { getShowCoordinates } from '@/lib/geo';
import TourExplorer from './tour-explorer';
import type { DatedPoint } from './tour-explorer';
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

  // 依日期排序，轉成地圖用的定位點資料（優先用場地自己的經緯度）
  const datedPoints: DatedPoint[] = allShows
    .map((show) => {
      const coords = getShowCoordinates(show, show.venue_data);
      if (!coords) return null;
      const city = show.venue_data?.city ?? getCity(show.venue) ?? null;
      const venueName = show.venue_data?.name ?? show.venue ?? '未知場地';
      return {
        date: show.show_date,
        city: city ?? '未知地點',
        venueName,
        venueKey: `${city ?? ''}__${venueName}`,
        lat: coords[0],
        lng: coords[1],
        title: show.title
      };
    })
    .filter((p): p is DatedPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const uncounted = allShows.length - datedPoints.length;

  const monthlyTimeline = buildMonthlyTimeline(allShows);

  // ── 數字摘要與排行（全部歷史，不受地圖上的月份篩選影響） ──
  const countryCount = new Set(allShows.map((x) => countryOfVenue(x.venue)).filter(Boolean)).size;

  const cityCounts = new Map<string, number>();
  const venueCounts = new Map<string, { count: number; city: string }>();
  for (const show of allShows) {
    const city = getCity(show.venue);
    if (city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    const venue = venueGroupName(show.venue);
    if (venue && city) {
      const key = `${city}__${venue}`;
      venueCounts.set(key, { count: (venueCounts.get(key)?.count ?? 0) + 1, city });
    }
  }
  const cityRanking = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'));
  const venueRanking = Array.from(venueCounts.entries())
    .map(([key, v]) => ({ name: key.split('__')[1], city: v.city, count: v.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant'));

  // 總移動距離：依演出日期，把前後兩場的場地直線距離加總（同一城市連續的場次幾乎是 0，海外往返用直線飛行距離）
  let totalKm = 0;
  for (let i = 1; i < datedPoints.length; i++) {
    totalKm += distanceKm([datedPoints[i - 1].lat, datedPoints[i - 1].lng], [datedPoints[i].lat, datedPoints[i].lng]);
  }
  const nf = new Intl.NumberFormat('zh-TW');
  const summary = [
    { label: '國家', value: String(countryCount), unit: '個' },
    { label: '城市', value: String(cityCounts.size), unit: '座' },
    { label: '場地', value: String(venueCounts.size), unit: '個' },
    { label: '總移動距離', value: nf.format(Math.round(totalKm / 10) * 10), unit: '公里', note: '依演出順序，場地之間的直線距離，約略值' }
  ];
  const maxCity = Math.max(1, ...cityRanking.map(([, n]) => n));
  const maxVenue = Math.max(1, ...venueRanking.map((v) => v.count));
  const topVenues = venueRanking.slice(0, 10);


  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '巡演足跡', path: '/tour' }])} />
      <div className="mx-auto max-w-5xl">
        <BackLink />

        <div className="mt-6">
          <PageHeader
            eyebrow="Tour Archive"
            title="巡演足跡"
            description={`${allShows.length} 場演出，走過 ${new Set(datedPoints.map((p) => p.city)).size} 個城市${
              uncounted > 0 ? `（另有 ${uncounted} 場還沒有定位資料，不會顯示在地圖上）` : ''
            }`}
          />
        </div>

        {allShows.length > 0 && (
          <section className="mt-8 grid grid-cols-2 gap-px border-2 border-stage-700 bg-stage-700 sm:grid-cols-4" aria-label="巡演數字摘要">
            {summary.map((x) => (
              <div key={x.label} className="bg-stage-900 p-4">
                <p className="text-xs text-stone-500">{x.label}</p>
                <p className="mt-1 text-3xl font-black text-paper sm:text-4xl">
                  {x.value}
                  <span className="ml-1 text-sm font-bold text-stone-400">{x.unit}</span>
                </p>
                {x.note && <p className="mt-0.5 text-[11px] leading-snug text-stone-500">{x.note}</p>}
              </div>
            ))}
          </section>
        )}

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title flex-1 text-xl">演出地圖與移動路線</h2>
            <span className="ml-4 hidden text-xs text-stone-500 sm:block">拖曳下方拉桿可篩選時間區間</span>
          </div>
          <TourExplorer points={datedPoints} />
        </section>

        {allShows.length > 0 && (
          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-10">
            <section className="min-w-0">
              <h2 className="section-title mb-2 text-xl">城市排行</h2>
              <p className="mb-4 text-sm text-stone-500">各城市的演出場數。</p>
              <ol className="border-y border-stage-700">
                {cityRanking.map(([city, n], i) => (
                  <BarRow
                    key={city}
                    rank={String(i + 1).padStart(2, '0')}
                    label={city}
                    percent={(n / maxCity) * 100}
                    value={
                      <>
                        {n}
                        <span className="ml-0.5 text-[11px] font-normal text-stone-400"> 場</span>
                      </>
                    }
                    strong={i === 0}
                    labelWidth="7rem"
                  />
                ))}
              </ol>
            </section>

            <section className="min-w-0">
              <h2 className="section-title mb-2 text-xl">場地排行</h2>
              <p className="mb-4 text-sm text-stone-500">最常去的場地（同一場館的不同舞台、大庫小庫合併計算），列前 10 個。</p>
              <ol className="border-y border-stage-700">
                {topVenues.map((v, i) => (
                  <BarRow
                    key={`${v.city}-${v.name}`}
                    rank={String(i + 1).padStart(2, '0')}
                    label={v.name}
                    note={v.city}
                    percent={(v.count / maxVenue) * 100}
                    value={
                      <>
                        {v.count}
                        <span className="ml-0.5 text-[11px] font-normal text-stone-400"> 場</span>
                      </>
                    }
                    strong={i === 0}
                    labelWidth="12rem"
                  />
                ))}
              </ol>
            </section>
          </div>
        )}

        <section className="mt-14">
          <h2 className="section-title mb-4 text-xl">逐月演出趨勢</h2>
          {monthlyTimeline.length > 0 ? (
            <MonthlyHeatmap timeline={monthlyTimeline} currentYearMonth={todayTaipei().slice(0, 7)} />
          ) : (
            <p className="text-sm text-stone-500">還沒有演出資料。</p>
          )}
        </section>
      </div>
    </main>
  );
}
