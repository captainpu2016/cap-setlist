'use client';

import { useRef, useState } from 'react';

const nf = new Intl.NumberFormat('zh-TW');

export interface DailyPoint {
  /** YYYY-MM-DD */
  date: string;
  label: string;
  users: number;
  views: number;
}

export interface ShowMarker {
  date: string;
  title: string;
}

const W = 800;
const H = 200;
const PAD = { l: 36, r: 8, t: 10, b: 22 };

/** 每日趨勢面積圖：瀏覽量（灰底）疊上訪客（紅線）。滑鼠移過或手指按住會出現十字線與數字，演出日以虛線標示 */
export default function AreaChart({ data, markers = [] }: { data: DailyPoint[]; markers?: ShowMarker[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) return <p className="text-sm text-stone-400">這段期間還沒有資料。</p>;

  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const rawMax = Math.max(1, ...data.map((d) => d.views));
  const step = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const max = Math.ceil(rawMax / step) * step;
  const x = (i: number) => PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = (key: 'users' | 'views') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const area = `${line('views')} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const labelIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  function pick(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const vx = ((clientX - rect.left) / rect.width) * W;
    const ratio = (vx - PAD.l) / iw;
    setActive(Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))));
  }

  const point = active !== null ? data[active] : null;
  const shows = point ? markers.filter((m) => m.date === point.date) : [];
  const leftPct = active !== null ? (x(active) / W) * 100 : 0;
  // 靠近兩側時把提示框往內靠，避免被切掉
  const tipAlign = leftPct < 22 ? 'translateX(0)' : leftPct > 78 ? 'translateX(-100%)' : 'translateX(-50%)';

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-3 rounded-sm bg-stone-300" />瀏覽量</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-3 bg-red-600" />訪客</span>
        {markers.length > 0 && (
          <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-0 border-l border-dashed border-stone-900" />演出日</span>
        )}
      </div>

      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-pan-y select-none"
          role="img"
          aria-label="每日瀏覽量與訪客趨勢"
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth="1" />
              <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#a8a29e">{nf.format(t)}</text>
            </g>
          ))}
          <path d={area} fill="#d6d3d1" opacity="0.55" />
          <path d={line('views')} fill="none" stroke="#57534e" strokeWidth="1.5" />
          <path d={line('users')} fill="none" stroke="#dc2626" strokeWidth="2" />

          {markers.map((m) => {
            const i = data.findIndex((d) => d.date === m.date);
            if (i < 0) return null;
            return (
              <g key={m.date + m.title}>
                <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={y(0)} stroke="#1c1917" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={x(i)} cy={PAD.t} r="3.5" fill="#1c1917" />
              </g>
            );
          })}

          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="10" fill="#a8a29e">
              {data[i].label}
            </text>
          ))}

          {point && active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={PAD.t} y2={y(0)} stroke="#78716c" strokeWidth="1" />
              <circle cx={x(active)} cy={y(point.views)} r="3.5" fill="#fff" stroke="#57534e" strokeWidth="1.5" />
              <circle cx={x(active)} cy={y(point.users)} r="3.5" fill="#fff" stroke="#dc2626" strokeWidth="2" />
            </g>
          )}
        </svg>

        {point && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-[8rem] max-w-[14rem] rounded-md border border-stone-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: `${leftPct}%`, transform: tipAlign }}
          >
            <p className="font-medium text-stone-900">{point.date.replace(/-/g, '/')}</p>
            <p className="mt-1 flex justify-between gap-4 tabular-nums text-stone-600">
              <span>瀏覽量</span><b className="text-stone-900">{nf.format(point.views)}</b>
            </p>
            <p className="flex justify-between gap-4 tabular-nums text-stone-600">
              <span className="text-red-600">訪客</span><b className="text-stone-900">{nf.format(point.users)}</b>
            </p>
            {shows.map((s) => (
              <p key={s.title} className="mt-1.5 border-t border-stone-100 pt-1.5 text-stone-700">🎤 {s.title}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
