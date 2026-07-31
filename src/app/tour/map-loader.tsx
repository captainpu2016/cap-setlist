'use client';

import dynamic from 'next/dynamic';
import type { TourPoint, RoutePoint } from './tour-map';

// Leaflet 依賴瀏覽器的 window/document，不能在伺服器端渲染，
// 這裡用 next/dynamic 搭配 ssr: false 延後到瀏覽器端才載入地圖元件。
const TourMap = dynamic(() => import('./tour-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-lg border border-stage-700 bg-stage-900/60 text-sm text-stone-500">
      地圖載入中…
    </div>
  )
});

export default function MapLoader({ points, route }: { points: TourPoint[]; route?: RoutePoint[] }) {
  return <TourMap points={points} route={route} />;
}
