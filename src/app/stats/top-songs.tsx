'use client';

import { useState } from 'react';
import { displaySongTitle } from '@/lib/song-title';
import type { RankedSong } from '@/lib/stats';
import { BarRow } from '@/components/BarRow';

export interface TopSongsPeriod {
  key: string;
  label: string;
  showCount: number;
  rows: RankedSong[];
}

function Bars({ rows, total }: { rows: RankedSong[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ol className="border-y border-stage-700">
      {rows.map((r, i) => (
        <BarRow
          key={r.id}
          rank={String(i + 1).padStart(2, '0')}
          label={displaySongTitle(r.title)}
          percent={(r.count / max) * 100}
          value={
            <>
              {r.count}
              <span className="ml-0.5 text-[11px] font-normal text-stone-400"> 場</span>
            </>
          }
          valueNote={`${total > 0 ? Math.round((r.count / total) * 100) : 0}%`}
          href={`/song/${r.id}`}
          strong={i === 0}
        />
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
