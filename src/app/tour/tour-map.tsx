'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface TourPoint {
  city: string;
  count: number;
  lat: number;
  lng: number;
}

export default function TourMap({ points }: { points: TourPoint[] }) {
  const center: [number, number] =
    points.length > 0
      ? [
          points.reduce((sum, p) => sum + p.lat, 0) / points.length,
          points.reduce((sum, p) => sum + p.lng, 0) / points.length
        ]
      : [23.6978, 120.9605]; // 找不到任何點時，預設置中在台灣

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-stage-700">
      <MapContainer
        center={center}
        zoom={points.length > 1 ? 5 : 10}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#170f0a' }}
      >
        {/* 用深色系的免費底圖（CartoDB Dark Matter），跟網站深色風格搭 */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
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
