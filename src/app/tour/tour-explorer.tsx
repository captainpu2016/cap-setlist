'use client';

import { useMemo, useState } from 'react';
import MapLoader from './map-loader';
import type { TourPoint, RoutePoint } from './tour-map';

export interface DatedPoint {
  date: string; // YYYY-MM-DD
  city: string;
  venueName: string;
  venueKey: string; // city + 場地名稱，用來分組聚合成地圖上的點
  lat: number;
  lng: number;
  title: string;
}

function formatMonthKey(key: string) {
  const [y, m] = key.split('-');
  return `${y}/${Number(m)}`;
}

/** 算出「最近 12 個月」對應到 monthKeys 陣列的起始 index，找不到就從頭開始 */
function getDefaultStartIndex(monthKeys: string[]): number {
  if (monthKeys.length === 0) return 0;
  const today = new Date();
  const cutoff = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
  const idx = monthKeys.findIndex((k) => k >= cutoffKey);
  return idx === -1 ? 0 : idx;
}

export default function TourExplorer({ points }: { points: DatedPoint[] }) {
  const monthKeys = useMemo(() => {
    const set = new Set(points.map((p) => p.date.slice(0, 7)));
    return Array.from(set).sort();
  }, [points]);

  const defaultStartIdx = useMemo(() => getDefaultStartIndex(monthKeys), [monthKeys]);
  const defaultEndIdx = Math.max(monthKeys.length - 1, 0);

  const [startIdx, setStartIdx] = useState(defaultStartIdx);
  const [endIdx, setEndIdx] = useState(defaultEndIdx);
  const [showRoute, setShowRoute] = useState(true);

  if (monthKeys.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">
        目前還沒有可定位的演出地點。
      </p>
    );
  }

  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);
  const rangeStart = monthKeys[lo];
  const rangeEnd = monthKeys[hi];
  const isFiltered = lo !== defaultStartIdx || hi !== defaultEndIdx;

  const filtered = points.filter((p) => {
    const ym = p.date.slice(0, 7);
    return ym >= rangeStart && ym <= rangeEnd;
  });

  // 依場地（城市＋場館名稱）聚合成地圖上的圖示，而不是只依城市聚合
  const dotMap = new Map<string, TourPoint>();
  for (const p of filtered) {
    const existing = dotMap.get(p.venueKey);
    if (existing) {
      existing.count += 1;
    } else {
      dotMap.set(p.venueKey, { label: p.venueName, city: p.city, count: 1, lat: p.lat, lng: p.lng });
    }
  }
  const dots = Array.from(dotMap.values());

  // 依日期排序，用來畫移動路線
  const route: RoutePoint[] = [...filtered]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ lat: p.lat, lng: p.lng, date: p.date, title: p.title }));

  return (
    <div>
      {/* 篩選區間：一列就好——起始月份、結束月份兩個下拉，右邊是路線開關與快速切換 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-2 border-stage-700 bg-stage-900 px-3 py-2.5 text-xs text-stone-400">
        <span className="font-accent uppercase tracking-[0.2em] text-stone-500">期間</span>
        <select
          value={lo}
          onChange={(e) => setStartIdx(Number(e.target.value))}
          aria-label="起始月份"
          className="border-2 border-stage-700 bg-stage-950 px-2 py-1 text-sm font-bold text-paper focus:border-signal focus:outline-none"
        >
          {monthKeys.map((k, i) => (
            <option key={k} value={i}>
              {formatMonthKey(k)}
            </option>
          ))}
        </select>
        <span>至</span>
        <select
          value={hi}
          onChange={(e) => setEndIdx(Number(e.target.value))}
          aria-label="結束月份"
          className="border-2 border-stage-700 bg-stage-950 px-2 py-1 text-sm font-bold text-paper focus:border-signal focus:outline-none"
        >
          {monthKeys.map((k, i) => (
            <option key={k} value={i}>
              {formatMonthKey(k)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setStartIdx(0);
            setEndIdx(defaultEndIdx);
          }}
          className={`px-2 py-1 font-bold transition-colors hover:text-paper ${lo === 0 && hi === defaultEndIdx ? 'text-signal' : ''}`}
        >
          全部
        </button>
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setStartIdx(defaultStartIdx);
              setEndIdx(defaultEndIdx);
            }}
            className="px-2 py-1 font-bold transition-colors hover:text-paper"
          >
            近一年
          </button>
        )}
        <label className="ml-auto flex items-center gap-2">
          <input type="checkbox" checked={showRoute} onChange={(e) => setShowRoute(e.target.checked)} className="accent-signal" />
          顯示移動路線
        </label>
      </div>

      <MapLoader points={dots} route={showRoute ? route : []} />
    </div>
  );
}
