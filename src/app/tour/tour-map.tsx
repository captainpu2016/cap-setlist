'use client';

import { Fragment } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface TourPoint {
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

/** 用一個會依方位角旋轉的三角形當箭頭圖示，不需要額外的圖檔資源 */
function arrowIcon(angleDeg: number) {
  return L.divIcon({
    className: '',
    html: `<div style="transform: rotate(${angleDeg}deg); width:16px; height:16px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#e2231c"><path d="M12 2 L20 21 L12 16 L4 21 Z"/></svg>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
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

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-stage-700">
      <MapContainer
        center={center}
        zoom={points.length > 1 ? 5 : 8}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#170f0a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {segments.map((seg, i) => {
          if (seg.from.lat === seg.to.lat && seg.from.lng === seg.to.lng) return null;
          const mid: [number, number] = [(seg.from.lat + seg.to.lat) / 2, (seg.from.lng + seg.to.lng) / 2];
          const angle = bearing(seg.from.lat, seg.from.lng, seg.to.lat, seg.to.lng);
          return (
            <Fragment key={`${seg.from.date}-${i}`}>
              <Polyline
                positions={[
                  [seg.from.lat, seg.from.lng],
                  [seg.to.lat, seg.to.lng]
                ]}
                pathOptions={{ color: '#c9a876', weight: 2, opacity: 0.6, dashArray: '4 6' }}
              />
              <Marker position={mid} icon={arrowIcon(angle)} />
            </Fragment>
          );
        })}

        {points.map((p) => (
          <CircleMarker
            key={p.city}
            center={[p.lat, p.lng]}
            radius={8 + Math.min(p.count, 10) * 2}
            pathOptions={{ color: '#c9a876', fillColor: '#e2231c', fillOpacity: 0.75, weight: 2 }}
          >
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>{p.city}</strong>
                <br />
                {p.count} 場演出
                <br />
                <a href={`/?city=${encodeURIComponent(p.city)}`} style={{ color: '#e2231c' }}>
                  查看這裡的演出 →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
