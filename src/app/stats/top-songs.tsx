'use client';

import { useState } from 'react';
import { displaySongTitle } from '@/lib/song-title';
import type { RankedSong } from '@/lib/stats';

export interface TopSongsPeriod {
  key: string;
  label: string;
  showCount: number;
  rows: RankedSong[];
}

/** 排行：長條畫在整列後面，歌名直接壓在上面，第一名顏色加深；一眼看得出差距又不會有細線的單薄感 */
function Bars({ rows, total }: { rows: RankedSong[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ol className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={r.id}>
          <a href={`/song/${r.id}`} className="group relative block overflow-hidden border border-stage-700 bg-stage-900 transition-colors hover:border-stone-500">
            <div
              className={`absolute inset-y-0 left-0 border-r-2 border-signal bg-signal ${i === 0 ? 'opacity-45' : 'opacity-25'}`}
              style={{ width: `${(r.count / max) * 100}%` }}
              aria-hidden
            />
            <div className="relative flex items-center gap-3 px-3 py-2.5">
              <span className={`w-6 shrink-0 font-accent text-sm ${i === 0 ? 'text-signal' : 'text-stone-500'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm ${i === 0 ? 'font-bold' : 'font-medium'} text-paper`}>
                {displaySongTitle(r.title)}
              </span>
              <span className="shrink-0 text-right font-accent text-base font-semibold leading-tight text-paper">
                {r.count}
                <span className="ml-0.5 text-[11px] font-normal text-stone-400"> 場</span>
                <span className="block text-[11px] font-normal text-stone-400">{total > 0 ? Math.round((r.count / total) * 100) : 0}%</span>
              </span>
            </div>
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function TopSongs({ periods }: { periods: TopSongsPeriod[] }) {
  const [active, setActive] = useState(periods[periods.length - 1].key);
  const period = periods.find((p) => p.key === active) ?? periods[0];

  return (
    <div>
      <div role="tablist" aria-label="統計期間" className="mb-3 flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={p.key === active}
            onClick={() => setActive(p.key)}
            className={`border-2 px-3 py-1.5 font-accent text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
              p.key === active
                ? 'border-signal bg-signal text-paper'
                : 'border-stage-700 text-stone-400 hover:border-stone-500 hover:text-paper'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-stone-500">共 {period.showCount} 場演出，百分比是「出現在多少場裡」</span>
      </div>
      {period.rows.length > 0 ? (
        <Bars rows={period.rows} total={period.showCount} />
      ) : (
        <p className="border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">
          這段期間還沒有已公開歌單的演出。
        </p>
      )}
    </div>
  );
}
