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
      <p className="rounded-lg border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">
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
      <div className="mb-4 rounded-lg border border-stage-700 bg-stage-900/60 p-4">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>起始：{formatMonthKey(rangeStart)}</span>
          <span>結束：{formatMonthKey(rangeEnd)}</span>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-stone-500">起始月份</label>
          <input
            type="range"
            min={0}
            max={monthKeys.length - 1}
            value={startIdx}
            onChange={(e) => setStartIdx(Number(e.target.value))}
            className="w-full accent-marquee"
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-stone-500">結束月份</label>
          <input
            type="range"
            min={0}
            max={monthKeys.length - 1}
            value={endIdx}
            onChange={(e) => setEndIdx(Number(e.target.value))}
            className="w-full accent-marquee"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-stone-400">
            <input
              type="checkbox"
              checked={showRoute}
              onChange={(e) => setShowRoute(e.target.checked)}
              className="accent-marquee"
            />
            顯示移動路線
          </label>
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setStartIdx(defaultStartIdx);
                setEndIdx(defaultEndIdx);
              }}
              className="text-xs uppercase tracking-widest text-stone-500 hover:text-marquee"
            >
              重設為近一年
            </button>
          )}
        </div>
      </div>

      <MapLoader points={dots} route={showRoute ? route : []} />
    </div>
  );
}
