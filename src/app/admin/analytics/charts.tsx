import { pctChange } from './helpers';

const nf = new Intl.NumberFormat('zh-TW');

export function DeltaBadge({ cur, prev }: { cur: number; prev: number }) {
  const pct = pctChange(cur, prev);
  if (pct === null) return <span className="text-xs font-medium text-emerald-600">新增</span>;
  if (Math.abs(pct) < 0.5) return <span className="text-xs text-stone-400">持平</span>;
  const up = pct > 0;
  return (
    <span className={`text-xs font-medium tabular-nums ${up ? 'text-emerald-600' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  cur,
  prev,
  hint
}: {
  label: string;
  value: string;
  cur: number;
  prev: number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{value}</p>
      <p className="mt-1 flex items-center gap-1.5">
        <DeltaBadge cur={cur} prev={prev} />
        <span className="text-xs text-stone-400">{hint ?? '較前一期'}</span>
      </p>
    </div>
  );
}

export function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-bold text-stone-900">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-stone-400">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export interface BarRow {
  name: string;
  value: number;
  sub?: string;
  badge?: { text: string; tone: 'good' | 'warn' | 'muted' };
}

const BADGE_TONE = {
  good: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-red-50 text-red-600',
  muted: 'bg-stone-100 text-stone-500'
} as const;

export function BarList({ rows, unit, showShare = true }: { rows: BarRow[]; unit: string; showShare?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-stone-400">這段期間還沒有資料。</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-stone-800">{r.name}</span>
              {r.badge && (
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${BADGE_TONE[r.badge.tone]}`}>
                  {r.badge.text}
                </span>
              )}
            </span>
            <span className="shrink-0 tabular-nums text-stone-600">
              {nf.format(r.value)} {unit}
              {showShare && <span className="ml-2 text-xs text-stone-400">{((r.value / total) * 100).toFixed(0)}%</span>}
            </span>
          </div>
          {r.sub && <p className="truncate text-xs text-stone-400">{r.sub}</p>}
          <div className="mt-1 h-1.5 rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-stone-800" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface DailyPoint {
  label: string;
  users: number;
  views: number;
}

/** 每日趨勢面積圖：瀏覽量（深色底）疊上訪客（紅線），滑過每一天會顯示數字 */
export function AreaChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) return <p className="text-sm text-stone-400">這段期間還沒有資料。</p>;
  const W = 800;
  const H = 200;
  const pad = { l: 36, r: 8, t: 10, b: 22 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const rawMax = Math.max(1, ...data.map((d) => d.views));
  const step = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const max = Math.ceil(rawMax / step) * step;
  const x = (i: number) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = (key: 'users' | 'views') => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const area = `${line('views')} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const labelIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const colW = iw / Math.max(1, data.length - 1);

  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-3 rounded-sm bg-stone-300" />瀏覽量</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-3 bg-red-600" />訪客</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="每日瀏覽量與訪客趨勢">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#a8a29e">{nf.format(t)}</text>
          </g>
        ))}
        <path d={area} fill="#d6d3d1" opacity="0.55" />
        <path d={line('views')} fill="none" stroke="#57534e" strokeWidth="1.5" />
        <path d={line('users')} fill="none" stroke="#dc2626" strokeWidth="2" />
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="10" fill="#a8a29e">
            {data[i].label}
          </text>
        ))}
        {data.map((d, i) => (
          <rect key={i} x={x(i) - colW / 2} y={pad.t} width={colW} height={ih} fill="transparent">
            <title>{`${d.label}：${nf.format(d.views)} 次瀏覽、${nf.format(d.users)} 位訪客`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/** 星期 × 小時熱度圖。cells[weekdayIndex(0=週一)][hour] */
export function Heatmap({ cells }: { cells: number[][] }) {
  const max = Math.max(1, ...cells.flat());
  let peak = { d: 0, h: 0, v: 0 };
  cells.forEach((row, d) => row.forEach((v, h) => { if (v > peak.v) peak = { d, h, v }; }));
  if (peak.v === 0) return <p className="text-sm text-stone-400">這段期間還沒有資料。</p>;
  return (
    <div>
      <p className="mb-3 text-sm text-stone-600">
        最多人上線的時段：<b className="text-stone-900">週{WEEKDAYS[peak.d]} {String(peak.h).padStart(2, '0')}:00</b>
        <span className="text-xs text-stone-400">（{nf.format(peak.v)} 次造訪）</span>
      </p>
      <div className="grid grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-[2px]">
        {cells.map((row, d) => (
          <div key={d} className="contents">
            <span className="pr-1.5 text-right text-[11px] leading-5 text-stone-400">{WEEKDAYS[d]}</span>
            {row.map((v, h) => (
              <div
                key={h}
                title={`週${WEEKDAYS[d]} ${String(h).padStart(2, '0')}:00　${nf.format(v)} 次造訪`}
                className="h-5 rounded-[2px]"
                style={{ background: v === 0 ? '#f5f5f4' : `rgba(220,38,38,${0.15 + (v / max) * 0.85})` }}
              />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center text-[10px] text-stone-400">{h % 6 === 0 ? h : ''}</span>
        ))}
      </div>
    </div>
  );
}
