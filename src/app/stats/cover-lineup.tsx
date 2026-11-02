'use client';

import { useState } from 'react';
import type { CoverGroup } from '@/lib/stats';

const LIMIT = 8;

/** 翻唱的歌：海外樂團、台灣樂團用兩個分頁切換；每一列是一個原唱樂團，預設只列前幾組，按鈕展開全部 */
export default function CoverLineup({ foreign, taiwan }: { foreign: CoverGroup[]; taiwan: CoverGroup[] }) {
  const tabs = [
    { key: 'foreign', label: '海外樂團', groups: foreign },
    { key: 'taiwan', label: '台灣樂團', groups: taiwan }
  ].filter((t) => t.groups.length > 0);
  const [active, setActive] = useState(tabs[0]?.key ?? 'foreign');
  const [expanded, setExpanded] = useState(false);

  if (tabs.length === 0) return null;
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  const shown = expanded ? current.groups : current.groups.slice(0, LIMIT);

  return (
    <div>
      <div role="tablist" aria-label="翻唱的原唱樂團" className="mb-3 flex flex-wrap items-center gap-2">
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
            {t.label} {t.groups.length}
          </button>
        ))}
      </div>

      <ul className="border-y border-stage-700">
        {shown.map((g) => (
          <li key={g.artist} className="flex flex-col gap-2 border-b border-stage-700/70 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6">
            <p className="shrink-0 text-sm font-bold text-paper sm:w-56">{g.artist}</p>
            <ul className="flex min-w-0 flex-wrap gap-1.5">
              {g.songs.map((song) => (
                <li key={song.id} className="min-w-0 max-w-full">
                  <a
                    href={`/song/${song.id}`}
                    className="block max-w-full truncate border border-stage-700 bg-stage-900 px-2.5 py-1 text-xs text-stone-300 transition-colors hover:border-marquee hover:text-marquee"
                  >
                    {song.name}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {current.groups.length > LIMIT && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="btn-ghost mt-4 !px-4 !py-2 text-xs">
          {expanded ? '收合 ↑' : `顯示全部 ${current.groups.length} 組 ↓`}
        </button>
      )}
    </div>
  );
}
