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
