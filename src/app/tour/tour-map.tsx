'use client';

import { Fragment, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface TourPoint {
  label: string; // 場地名稱
  city: string;
  count: number;
  lat: number;
  lng: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  date: string;
  title: string;
}

/** 計算 A 點到 B 點的方位角（度），0 度是正北，順時針增加 */
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 兩點之間的二次貝茲弧線，控制點往行進方向的左側偏移；來回路線因方向相反，弧線會自然分在兩側 */
function curvePoints(a: RoutePoint, b: RoutePoint, steps = 32): [number, number][] {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  const bend = 0.18;
  const cLat = (a.lat + b.lat) / 2 + dLng * bend;
  const cLng = (a.lng + b.lng) / 2 - dLat * bend;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * a.lat + 2 * u * t * cLat + t * t * b.lat,
      u * u * a.lng + 2 * u * t * cLng + t * t * b.lng
    ]);
  }
  return pts;
}

/** 依巡迴先後在暗金色 → 紅色之間漸變，t 為 0~1 */
function routeColor(t: number): string {
  const from = [138, 109, 59];
  const to = [226, 35, 28];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** 用一個會依方位角旋轉的三角形當箭頭圖示，不需要額外的圖檔資源，加上脈動動畫更有生命力 */
function arrowIcon(angleDeg: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div class="route-arrow-pulse" style="transform: rotate(${angleDeg}deg); width:16px; height:16px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><path d="M12 2 L20 21 L12 16 L4 21 Z"/></svg>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

/** 場地圖釘圖示，大小依演出次數微調（去越多次的場地，圖釘越大） */
function venueIcon(count: number) {
  const size = Math.min(26 + count * 3, 44);
  return L.divIcon({
    className: '',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
      <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8z" fill="#e2231c" stroke="#c9a876" stroke-width="1"/>
      <circle cx="12" cy="8" r="3.2" fill="#170f0a"/>
    </svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });
}

/** 依 locked 狀態切換地圖的拖曳/縮放互動，手機上避免滑頁面時被地圖攔截手勢 */
function InteractionToggle({ locked }: { locked: boolean }) {
  const map = useMap();

  if (locked) {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
  } else {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
  }

  return null;
}

export default function TourMap({
  points,
  route = []
}: {
  points: TourPoint[];
  route?: RoutePoint[];
}) {
  const centerSource = points.length > 0 ? points : route;
  const center: [number, number] =
    centerSource.length > 0
      ? [
          centerSource.reduce((sum, p) => sum + p.lat, 0) / centerSource.length,
          centerSource.reduce((sum, p) => sum + p.lng, 0) / centerSource.length
        ]
      : [23.6978, 120.9605]; // 找不到任何點時，預設置中在台灣

  const segments: { from: RoutePoint; to: RoutePoint }[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    segments.push({ from: route[i], to: route[i + 1] });
  }

  // 只有觸控裝置（手機/平板）才預設鎖定，滑鼠裝置一開始就可以正常拖曳/滾輪縮放
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      setLocked(true);
    }
  }, []);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg border border-stage-700">
      <MapContainer
        center={center}
        zoom={points.length > 1 ? 6 : 9}
        dragging={!locked}
        touchZoom={!locked}
        doubleClickZoom={!locked}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#170f0a' }}
      >
        <InteractionToggle locked={locked} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {segments.map((seg, i) => {
          if (seg.from.lat === seg.to.lat && seg.from.lng === seg.to.lng) return null;
          const curve = curvePoints(seg.from, seg.to);
          const midIdx = Math.floor(curve.length / 2);
          const angle = bearing(curve[midIdx - 1][0], curve[midIdx - 1][1], curve[midIdx + 1][0], curve[midIdx + 1][1]);
          const t = segments.length > 1 ? i / (segments.length - 1) : 1;
          const color = routeColor(t);
          const isLatest = i === segments.length - 1;
          return (
            <Fragment key={`${seg.from.date}-${i}`}>
              {/* 外發光 */}
              <Polyline
                positions={curve}
                pathOptions={{ color, weight: 9, opacity: 0.18, lineCap: 'round', interactive: false }}
              />
              {/* 主線：最新一段持續流動，其餘為實線 */}
              <Polyline
                positions={curve}
                pathOptions={{
                  color,
                  weight: 3,
                  opacity: 0.9,
                  lineCap: 'round',
                  interactive: false,
                  ...(isLatest ? { dashArray: '10 8', className: 'route-flow-line' } : {})
                }}
              />
              <Marker position={curve[midIdx]} icon={arrowIcon(angle, color)} interactive={false} />
            </Fragment>
          );
        })}

        {points.map((p) => (
          <Marker key={`${p.city}-${p.label}`} position={[p.lat, p.lng]} icon={venueIcon(p.count)}>
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>{p.label}</strong>
                {p.city && <span style={{ color: '#888' }}> ・ {p.city}</span>}
                <br />
                {p.count} 場演出
                <br />
                {p.city && (
                  <a href={`/?city=${encodeURIComponent(p.city)}`} style={{ color: '#e2231c' }}>
                    查看這裡的演出 →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {locked && (
        <button
          type="button"
          onClick={() => setLocked(false)}
          className="absolute inset-0 flex items-center justify-center bg-stage-950/20 text-xs text-paper backdrop-blur-[1px] transition hover:bg-stage-950/10"
        >
          <span className="rounded-full bg-stage-950/80 px-4 py-2">輕觸以操作地圖</span>
        </button>
      )}
    </div>
  );
}