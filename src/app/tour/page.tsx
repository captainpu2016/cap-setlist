import { createClient } from '@/lib/supabase/server';
import type { Show, Venue } from '@/types/database';
import { getCity } from '@/lib/format';
import { getShowCoordinates } from '@/lib/geo';
import TourExplorer from './tour-explorer';
import type { DatedPoint } from './tour-explorer';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const revalidate = 3600;

export const metadata = {
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
  const supabase = createClient();
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
  const maxMonthly = Math.max(...monthlyTimeline.map((m) => m.count), 1);

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-3xl">
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

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold text-stone-300">演出地圖與移動路線</h2>
            <span className="text-xs text-stone-500">拖曳下方拉桿可篩選時間區間</span>
          </div>
          <TourExplorer points={datedPoints} />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold text-stone-300">逐月演出趨勢</h2>
          {monthlyTimeline.length > 0 ? (
            <div className="rounded-lg border border-stage-700 bg-stage-900/60 p-6">
              <div className="overflow-x-auto">
                <div
                  className="flex items-end gap-1.5"
                  style={{ minWidth: monthlyTimeline.length * 26 }}
                >
                  {monthlyTimeline.map((m, i) => {
                    const [year, month] = m.yearMonth.split('-');
                    const isYearStart = month === '01' || i === 0;
                    return (
                      <div key={m.yearMonth} title={`${year}/${Number(month)}：${m.count} 場`} className="flex w-6 shrink-0 flex-col items-center">
                        <span className="h-3 text-[10px] tabular-nums text-stone-500">{m.count || ''}</span>
                        {/* 固定高度的長條軌道，長條本身用百分比高度才會生效（CSS 規則：
                            百分比高度需要父層有明確的高度，不能只靠外層的 flex 撐開） */}
                        <div className="flex h-28 w-full items-end">
                          <div
                            className="w-full rounded-t transition-all"
                            style={{
                              height: `${(m.count / maxMonthly) * 100}%`,
                              minHeight: m.count > 0 ? 4 : 2,
                              backgroundColor: m.count > 0 ? '#c9a876' : '#40291a'
                            }}
                          />
                        </div>
                        <span className="mt-1 text-[10px] text-stone-500">
                          {isYearStart ? year : Number(month)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-3 text-xs text-stone-500">
                滑鼠移到長條上可以看該月確切場次數。
                {monthlyTimeline.length > 14 && '　可以左右滑動查看更早期的資料。'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-stone-500">還沒有演出資料。</p>
          )}
        </section>
      </div>
    </main>
  );
}
