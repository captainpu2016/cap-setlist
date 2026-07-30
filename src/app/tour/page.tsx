import { createClient } from '@/lib/supabase/server';
import type { Show } from '@/types/database';
import { getCity } from '@/lib/format';
import { getShowCoordinates } from '@/lib/geo';
import MapLoader from './map-loader';
import type { TourPoint } from './tour-map';

export const revalidate = 3600;

export const metadata = {
  title: '巡演足跡｜普通隊長',
  description: '普通隊長歷年演出地點地圖，以及各月份演出場次統計。'
};

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export default async function TourPage() {
  const supabase = createClient();
  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .eq('status', 'published')
    .returns<Show[]>();

  const allShows = shows ?? [];

  // 依城市把場次聚合成地圖上的點
  const pointsMap = new Map<string, TourPoint>();
  for (const show of allShows) {
    const coords = getShowCoordinates(show);
    if (!coords) continue;
    const city = getCity(show.venue) ?? show.venue ?? '未知地點';
    const existing = pointsMap.get(city);
    if (existing) {
      existing.count += 1;
    } else {
      pointsMap.set(city, { city, count: 1, lat: coords[0], lng: coords[1] });
    }
  }
  const points = Array.from(pointsMap.values());
  const uncounted = allShows.length - points.reduce((sum, p) => sum + p.count, 0);

  // 月份統計：不分年份，看哪個月份演出最密集
  const monthlyCounts = Array(12).fill(0);
  for (const show of allShows) {
    const monthIndex = Number(show.show_date.slice(5, 7)) - 1;
    if (monthIndex >= 0 && monthIndex < 12) monthlyCounts[monthIndex] += 1;
  }
  const maxMonthly = Math.max(...monthlyCounts, 1);

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-xs uppercase tracking-widest text-stone-500 hover:text-marquee">
          ← 返回場次列表
        </a>

        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-marquee">Tour Archive</p>
        <h1 className="mt-2 font-display text-3xl font-black text-paper sm:text-5xl">巡演足跡</h1>
        <p className="mt-3 text-stone-400">
          {allShows.length} 場演出，走過 {points.length} 個城市
          {uncounted > 0 && `（${uncounted} 場還沒有定位資料，不會顯示在地圖上）`}
        </p>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold text-stone-300">演出地圖</h2>
          {points.length > 0 ? (
            <MapLoader points={points} />
          ) : (
            <p className="rounded-lg border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">
              目前還沒有可定位的演出地點。
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold text-stone-300">哪個月最常表演</h2>
          <div className="rounded-lg border border-stage-700 bg-stage-900/60 p-6">
            <div className="flex h-40 items-end gap-2 sm:gap-3">
              {monthlyCounts.map((count, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs tabular-nums text-stone-500">{count || ''}</span>
                  <div
                    className="w-full rounded-t bg-marquee transition-all"
                    style={{
                      height: `${(count / maxMonthly) * 100}%`,
                      minHeight: count > 0 ? 4 : 0
                    }}
                  />
                  <span className="text-xs text-stone-500">{MONTH_LABELS[i]}月</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
