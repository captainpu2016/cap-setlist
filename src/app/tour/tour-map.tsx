'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
  const bend = 0.12;
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

/** 載入後自動縮放到剛好看得到所有場地，不用手動拖地圖找 */
function FitToTour({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  const key = coords.map((c) => c.join(',')).join('|');

  useEffect(() => {
    if (coords.length === 0) return;
    // 地圖剛掛載時容器尺寸可能還沒定案，先重算尺寸再縮放，否則會縮到錯誤的位置
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 10, animate: false });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

const CURVE_STEPS = 32;

/** 一段已畫完的路線：外發光、主線與中間的方向箭頭。用 memo 包起來，播放時只有正在畫的那一段會重畫 */
const Segment = memo(function Segment({ curve, color, angle, flowing }: { curve: [number, number][]; color: string; angle: number; flowing: boolean }) {
  const glow = useMemo(() => ({ color, weight: 9, opacity: 0.18, lineCap: 'round' as const, interactive: false }), [color]);
  const main = useMemo(
    () => ({ color, weight: 3, opacity: 0.9, lineCap: 'round' as const, interactive: false, ...(flowing ? { dashArray: '10 8', className: 'route-flow-line' } : {}) }),
    [color, flowing]
  );
  const icon = useMemo(() => arrowIcon(angle, color), [angle, color]);
  return (
    <>
      <Polyline positions={curve} pathOptions={glow} />
      <Polyline positions={curve} pathOptions={main} />
      <Marker position={curve[Math.floor(curve.length / 2)]} icon={icon} interactive={false} />
    </>
  );
});

/** 播放時走在路線最前面的光點 */
const headIcon = L.divIcon({
  className: '',
  html: '<div class="route-head-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const pad = (n: number) => String(n).padStart(2, '0');
const formatDate = (d: string) => d.replace(/-/g, '.');

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

  // 每一段路線的弧線、顏色、箭頭方向，route 不變就不重算
  const segs = useMemo(() => {
    const n = route.length - 1;
    return Array.from({ length: Math.max(n, 0) }, (_, i) => {
      const from = route[i];
      const to = route[i + 1];
      if (from.lat === to.lat && from.lng === to.lng) return null;
      const curve = curvePoints(from, to, CURVE_STEPS);
      const mid = Math.floor(curve.length / 2);
      const angle = bearing(curve[mid - 1][0], curve[mid - 1][1], curve[mid + 1][0], curve[mid + 1][1]);
      return { key: `${from.date}-${i}`, curve, angle, color: routeColor(n > 1 ? i / (n - 1) : 1) };
    });
  }, [route]);

  // ── 播放巡演：依日期一段一段把路線畫出來。t 是「走到第幾場」（小數代表正在兩場之間移動）
  const N = route.length;
  const canReplay = N >= 2;
  const [replay, setReplay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const segMs = Math.min(900, Math.max(250, 20000 / Math.max(N - 1, 1))); // 整段播放大約 20 秒
  const tRef = useRef(0);
  tRef.current = t;

  // 篩選條件改變（路線換了）就回到一般顯示
  const routeKey = route.map((r) => `${r.date}@${r.lat},${r.lng}`).join('|');
  useEffect(() => {
    setReplay(false);
    setPlaying(false);
    setT(0);
  }, [routeKey]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(N - 1, tRef.current + (now - last) / segMs);
      last = now;
      setT(next);
      if (next >= N - 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, N, segMs]);

  const start = () => {
    setReplay(true);
    setT(0);
    setPlaying(true);
  };
  const togglePlay = () => {
    if (!playing && t >= N - 1) {
      setT(0); // 播完之後再按一次＝重播
      setPlaying(true);
    } else setPlaying(!playing);
  };

  const idx = Math.min(N - 1, Math.floor(t));
  const doneCount = replay ? idx : segs.length;
  const frac = t - idx;
  const partial = replay && idx < segs.length ? segs[idx] : null;
  const headPos: [number, number] | null = !replay || N === 0 ? null : partial ? partial.curve[Math.min(CURVE_STEPS, Math.round(frac * CURVE_STEPS))] : [route[idx].lat, route[idx].lng];
  const current = route[idx];

  // 圖釘：播放時，場地要等路線走到才出現
  const firstVisit = useMemo(() => {
    const m = new Map<string, number>();
    route.forEach((r, i) => {
      const k = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
      if (!m.has(k)) m.set(k, i);
    });
    return m;
  }, [route]);
  const visiblePoints = replay ? points.filter((p) => (firstVisit.get(`${p.lat.toFixed(5)},${p.lng.toFixed(5)}`) ?? 0) <= idx) : points;

  // 只有觸控裝置（手機/平板）才預設鎖定，滑鼠裝置一開始就可以正常拖曳/滾輪縮放
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      setLocked(true);
    }
  }, []);

  return (
    <div className="relative h-[420px] w-full overflow-hidden border-2 border-stage-700">
      <MapContainer
        center={center}
        zoom={points.length > 1 ? 6 : 9}
        dragging={!locked}
        touchZoom={!locked}
        doubleClickZoom={!locked}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#0b0908' }}
      >
        <InteractionToggle locked={locked} />
        <FitToTour coords={[...points, ...route].map((p) => [p.lat, p.lng] as [number, number])} />
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={16}
        />

        {segs.map((sg, i) =>
          sg && i < doneCount ? <Segment key={sg.key} curve={sg.curve} angle={sg.angle} color={sg.color} flowing={!replay && i === segs.length - 1} /> : null
        )}
        {partial && frac > 0 && (
          <Polyline
            positions={partial.curve.slice(0, Math.floor(frac * CURVE_STEPS) + 1).concat([headPos as [number, number]])}
            pathOptions={{ color: partial.color, weight: 3, opacity: 0.95, lineCap: 'round', interactive: false }}
          />
        )}
        {headPos && <Marker position={headPos} icon={headIcon} interactive={false} zIndexOffset={1000} />}

        {visiblePoints.map((p) => (
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
          <span className="bg-stage-950/90 px-4 py-2 font-bold">輕觸以操作地圖</span>
        </button>
      )}

      {/* 播放巡演：沒開始時只有一顆按鈕；開始後底部出現播放列（暫停／拖動／目前的場次） */}
      {canReplay && !replay && (
        <button
          type="button"
          onClick={start}
          className="absolute bottom-3 left-3 z-[1100] flex items-center gap-2 border-2 border-signal bg-stage-950/90 px-3 py-2 text-xs font-bold text-paper backdrop-blur transition hover:bg-signal"
        >
          <span aria-hidden>▶</span> 播放巡演
        </button>
      )}
      {canReplay && replay && current && (
        <div className="absolute inset-x-2 bottom-2 z-[1100] border-2 border-stage-700 bg-stage-950/92 p-2.5 backdrop-blur sm:inset-x-3 sm:bottom-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? '暫停' : t >= N - 1 ? '重播' : '播放'}
              className="flex h-8 w-8 shrink-0 items-center justify-center bg-signal text-sm font-bold text-paper"
            >
              {playing ? '❚❚' : t >= N - 1 ? '↻' : '▶'}
            </button>
            <input
              type="range"
              min={0}
              max={N - 1}
              step={1}
              value={idx}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value));
              }}
              aria-label="巡演進度"
              className="min-w-0 flex-1 accent-signal"
            />
            <span className="shrink-0 font-accent text-xs tabular-nums text-stone-400">
              {pad(idx + 1)}/{pad(N)}
            </span>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setReplay(false);
                setT(0);
              }}
              className="shrink-0 px-1 text-xs text-stone-400 underline underline-offset-2 hover:text-paper"
            >
              結束
            </button>
          </div>
          <p className="mt-1.5 truncate text-xs text-stone-300">
            <span className="font-accent tabular-nums text-marquee">{formatDate(current.date)}</span>
            <span className="mx-1.5 text-stone-600">・</span>
            {current.title}
          </p>
        </div>
      )}
    </div>
  );
}