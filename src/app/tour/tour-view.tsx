'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { BarRow } from '@/components/BarRow';
import { countryOfVenue, distanceKm, getCityOf, venueGroupName } from '@/lib/geo';
import { matchesFilter } from '@/lib/show-filter';
import { useStatsFilter } from '../stats/stats-shell';
import MapLoader from './map-loader';
import type { RoutePoint, TourPoint } from './tour-map';
import VenueRanking, { type VenueGroup } from './venue-ranking';

export interface TourShow {
  date: string; // YYYY-MM-DD
  /** 篩選用欄位（和歌單統計頁同一份） */
  category: string | null;
  series: string | null;
  admission: string | null;
  country: string | null;
  city: string | null;
  title: string;
  venue: string | null;
  /** 場地名稱與座標（沒有座標的場次不會畫在地圖上，但仍會計入城市、場地與國家的統計） */
  venueName: string;
  venueKey: string;
  lat: number | null;
  lng: number | null;
  venueType: 'livehouse' | 'other' | null;
}

const nf = new Intl.NumberFormat('zh-TW');

/**
 * 巡演足跡的主體：數字摘要、地圖、城市排行、場地排行，都只算符合上方篩選（分類、入場、國家、城市、期間）的場次，
 * 篩選條件和歌單統計頁共用。逐月演出趨勢（children）看的是整個歷史，不受篩選影響。
 */
export default function TourView({ shows, children }: { shows: TourShow[]; children?: ReactNode }) {
  const filter = useStatsFilter();
  const [showRoute, setShowRoute] = useState(true);

  const filtered = useMemo(() => shows.filter((s) => matchesFilter(s, filter)).sort((a, b) => a.date.localeCompare(b.date)), [shows, filter]);
  const unlocated = filtered.filter((s) => s.lat == null).length;

  const stats = useMemo(() => {
    const countries = new Set(filtered.map((s) => countryOfVenue(s.venue)).filter(Boolean));
    const cityCounts = new Map<string, number>();
    const venueCounts = new Map<string, { name: string; city: string; count: number; type: string | null }>();
    for (const show of filtered) {
      const city = getCityOf(show.venue);
      if (city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
      const venue = venueGroupName(show.venue);
      if (venue && city) {
        const key = `${city}__${venue}`;
        const prev = venueCounts.get(key);
        venueCounts.set(key, {
          name: venue,
          city,
          count: (prev?.count ?? 0) + 1,
          type: prev?.type === 'livehouse' || show.venueType === 'livehouse' ? 'livehouse' : (prev?.type ?? show.venueType)
        });
      }
    }
    const cityRanking = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'));
    const venues = Array.from(venueCounts.values());
    const hasTypes = venues.some((v) => v.type);
    const livehouses = venues.filter((v) => v.type === 'livehouse');
    const others = venues.filter((v) => v.type === 'other');
    const untyped = venues.filter((v) => !v.type);

    // 總移動距離：依演出日期，把前後兩場（有座標的）的場地直線距離加總
    const located = filtered.filter((s): s is TourShow & { lat: number; lng: number } => s.lat != null && s.lng != null);
    let km = 0;
    for (let i = 1; i < located.length; i++) km += distanceKm([located[i - 1].lat, located[i - 1].lng], [located[i].lat, located[i].lng]);

    const groups: VenueGroup[] = hasTypes
      ? [
          { key: 'livehouse', label: 'Live house', venues: livehouses },
          { key: 'other', label: '其他場地', venues: others },
          { key: 'untyped', label: '未分類', venues: untyped }
        ]
      : [{ key: 'all', label: '場地', venues }];

    // 地圖：依場地聚合成點，依日期連成路線
    const dotMap = new Map<string, TourPoint>();
    for (const s of located) {
      const dot = dotMap.get(s.venueKey);
      if (dot) dot.count += 1;
      else dotMap.set(s.venueKey, { label: s.venueName, city: getCityOf(s.venue) ?? '未知地點', count: 1, lat: s.lat, lng: s.lng });
    }
    const route: RoutePoint[] = located.map((s) => ({ lat: s.lat, lng: s.lng, date: s.date, title: s.title }));

    return {
      countryCount: countries.size,
      cityCount: cityCounts.size,
      cityRanking,
      hasTypes,
      livehouseCount: livehouses.length,
      otherCount: others.length,
      untypedCount: untyped.length,
      venueTotal: venues.length,
      groups,
      km,
      dots: Array.from(dotMap.values()),
      route
    };
  }, [filtered]);

  if (shows.length === 0) {
    return <p className="mt-10 rounded-sm border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">目前還沒有演出資料。</p>;
  }

  const summary = [
    { label: '國家', value: String(stats.countryCount), unit: '個' },
    { label: '城市', value: String(stats.cityCount), unit: '座' },
    stats.hasTypes
      ? {
          label: 'Live house',
          value: String(stats.livehouseCount),
          unit: '間',
          note: `另有 ${stats.otherCount} 個其他場地（球場、廣場、校園等）${stats.untypedCount > 0 ? `、${stats.untypedCount} 個尚未分類` : ''}`
        }
      : { label: '場地', value: String(stats.venueTotal), unit: '個' },
    { label: '總移動距離', value: nf.format(Math.round(stats.km / 10) * 10), unit: '公里', note: '依演出順序，場地之間的直線距離，約略值' }
  ];
  const maxCity = Math.max(1, ...stats.cityRanking.map(([, n]) => n));

  // 篩選之後沒有任何場次：只留不受篩選影響的逐月趨勢
  if (filtered.length === 0) {
    return (
      <div>
        <p className="mt-10 border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">這個篩選條件下，沒有符合的演出。</p>
        {children}
      </div>
    );
  }

  return (
    <div>
      {/* 數字跟著上方篩選走（和歌單統計頁一樣）：符合條件的場次數，以及沒有定位、不會畫在地圖上的場次 */}
      <p className="mt-8 text-sm text-stone-400">
        共 <b className="text-paper">{filtered.length}</b> 場演出
        {unlocated > 0 && `（其中 ${unlocated} 場還沒有定位資料，不會顯示在地圖上）`}
      </p>

      <section className="mt-4 grid grid-cols-2 gap-px border-2 border-stage-700 bg-stage-700 sm:grid-cols-4" aria-label="巡演數字摘要">
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

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="section-title flex-1 text-xl">演出地圖與移動路線</h2>
          <label className="flex shrink-0 items-center gap-2 text-xs text-stone-400">
            <input type="checkbox" checked={showRoute} onChange={(e) => setShowRoute(e.target.checked)} className="accent-signal" />
            顯示移動路線
          </label>
        </div>
        <MapLoader points={stats.dots} route={showRoute ? stats.route : []} />
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-10">
        <section className="min-w-0">
          <h2 className="section-title mb-2 text-xl">城市排行</h2>
          <p className="mb-4 text-sm text-stone-500">各城市的演出場數。</p>
          <ol className="border-y border-stage-700">
            {stats.cityRanking.map(([city, n], i) => (
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
          <p className="mb-4 text-sm text-stone-500">最常去的場地。同一場館的不同廳、不同舞台合併計算（例如 LIVE WAREHOUSE 的大庫與小庫）。</p>
          <VenueRanking groups={stats.groups} />
        </section>
      </div>

      {children}
    </div>
  );
}
