'use client';

import { useState } from 'react';
import type { CoverGroup } from '@/lib/stats';

const PER_ORIGIN = 6;

/** 翻唱的歌：依原唱樂團一列一團，海外樂團在前；預設每一段只列前幾組，按鈕展開全部 */
export default function CoverLineup({ foreign, taiwan }: { foreign: CoverGroup[]; taiwan: CoverGroup[] }) {
  const [expanded, setExpanded] = useState(false);
  const total = foreign.length + taiwan.length;
  const needsToggle = foreign.length > PER_ORIGIN || taiwan.length > PER_ORIGIN;

  return (
    <div>
      {[
        ['海外樂團', foreign],
        ['台灣樂團', taiwan]
      ].map(([label, groups]) => {
        const all = groups as CoverGroup[];
        if (all.length === 0) return null;
        const shown = expanded ? all : all.slice(0, PER_ORIGIN);
        return (
          <div key={label as string} className="mt-6 first:mt-0">
            <h3 className="mb-1 flex items-baseline gap-3 font-accent text-xs uppercase tracking-[0.25em] text-signal">
              {label as string}
              <span className="text-stone-600">{all.length} 組</span>
            </h3>
            <ul className="border-y border-stage-700">
              {shown.map((g) => (
                <li
                  key={g.artist}
                  className="flex flex-col gap-2 border-b border-stage-700/70 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6"
                >
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
          </div>
        );
      })}
      {needsToggle && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="btn-ghost mt-5 !px-4 !py-2 text-xs">
          {expanded ? '收合 ↑' : `顯示全部 ${total} 組樂團 ↓`}
        </button>
      )}
    </div>
  );
}
