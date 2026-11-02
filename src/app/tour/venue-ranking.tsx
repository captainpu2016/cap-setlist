'use client';

import { useState } from 'react';
import { BarRow } from '@/components/BarRow';

export interface RankedVenue {
  name: string;
  city: string;
  count: number;
}

export interface VenueGroup {
  key: string;
  label: string;
  venues: RankedVenue[];
}

const LIMIT = 10;

/** 場地排行：Live house 與其他場地分頁（資料庫還沒有場地類型時只有一組，就不顯示分頁）；同一場館的不同廳已經合併計算 */
export default function VenueRanking({ groups }: { groups: VenueGroup[] }) {
  const tabs = groups.filter((g) => g.venues.length > 0);
  const [active, setActive] = useState(tabs[0]?.key ?? '');
  const [expanded, setExpanded] = useState(false);
  if (tabs.length === 0) return null;
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  const sorted = [...current.venues].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant'));
  const shown = expanded ? sorted : sorted.slice(0, LIMIT);
  const max = Math.max(1, ...sorted.map((v) => v.count));

  return (
    <div>
      {tabs.length > 1 && (
        <div role="tablist" aria-label="場地類型" className="mb-3 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === current.key}
              onClick={() => {
                setActive(t.key);
                setExpanded(false);
              }}
              className={`border-2 px-3 py-1.5 font-accent text-xs font-semibold tracking-[0.1em] transition-colors ${
                t.key === current.key ? 'border-signal bg-signal text-paper' : 'border-stage-700 text-stone-400 hover:border-stone-500 hover:text-paper'
              }`}
            >
              {t.label} {t.venues.length}
            </button>
          ))}
        </div>
      )}
      <ol className="border-y border-stage-700">
        {shown.map((v, i) => (
          <BarRow
            key={`${v.city}-${v.name}`}
            rank={String(i + 1).padStart(2, '0')}
            label={v.name}
            note={v.city}
            percent={(v.count / max) * 100}
            value={
              <>
                {v.count}
                <span className="ml-0.5 text-[11px] font-normal text-stone-400"> 場</span>
              </>
            }
            strong={i === 0}
            labelWidth="12rem"
          />
        ))}
      </ol>
      {sorted.length > LIMIT && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="btn-ghost mt-4 !px-4 !py-2 text-xs">
          {expanded ? '收合 ↑' : `顯示全部 ${sorted.length} 個 ↓`}
        </button>
      )}
    </div>
  );
}
