'use client';

import { useState } from 'react';
import { formatShowDateShort } from '@/lib/format';

export interface DormantSong {
  id: string;
  title: string;
  lastDate: string;
  count: number;
  showsSince: number;
}

export interface OneTimerSong {
  id: string;
  title: string;
  showTitle: string;
  date: string;
  slug: string;
}

const LIMIT = 8;

/** 稀有的歌：「久違」（唱過兩場以上，但最近好幾場都沒出現）與「僅一次」兩個分頁，預設只列前幾首 */
export default function RareSongs({ dormant, oneTimers }: { dormant: DormantSong[]; oneTimers: OneTimerSong[] }) {
  const tabs = [
    { key: 'dormant', label: '久違', count: dormant.length },
    { key: 'once', label: '僅一次', count: oneTimers.length }
  ].filter((t) => t.count > 0);
  const [active, setActive] = useState(tabs[0]?.key ?? 'dormant');
  const [expanded, setExpanded] = useState(false);

  if (tabs.length === 0) {
    return <p className="border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">這個條件下沒有稀有的歌。</p>;
  }
  const current = tabs.some((t) => t.key === active) ? active : tabs[0].key;
  const list = current === 'dormant' ? dormant : oneTimers;
  const visible = expanded ? list : list.slice(0, LIMIT);

  return (
    <div>
      <div role="tablist" aria-label="稀有的歌" className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === current}
            onClick={() => {
              setActive(t.key);
              setExpanded(false);
            }}
            className={`border-2 px-3 py-1.5 font-accent text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
              t.key === current ? 'border-signal bg-signal text-paper' : 'border-stage-700 text-stone-400 hover:border-stone-500 hover:text-paper'
            }`}
          >
            {t.label} {t.count}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-stone-500">
        {current === 'dormant' ? '唱過兩場以上，但最近好幾場都沒有出現。' : '只唱過一次，想聽到可能要靠運氣。'}
      </p>
      <ul className="border-y border-stage-700">
        {current === 'dormant'
          ? (visible as DormantSong[]).map((d) => (
              <li key={d.id} className="border-b border-stage-700/70 last:border-b-0">
                <a href={`/song/${d.id}`} className="flex items-center justify-between gap-4 px-2 py-2.5 text-sm hover:bg-stage-900">
                  <span className="min-w-0 truncate text-paper">{d.title}</span>
                  <span className="shrink-0 text-right text-xs text-stone-500">
                    已 {d.showsSince} 場沒唱
                    <span className="block text-[11px] text-stone-600">上次 {formatShowDateShort(d.lastDate)}</span>
                  </span>
                </a>
              </li>
            ))
          : (visible as OneTimerSong[]).map((d) => (
              <li key={d.id} className="border-b border-stage-700/70 last:border-b-0">
                <a href={`/show/${d.slug}`} className="flex items-center justify-between gap-4 px-2 py-2.5 text-sm hover:bg-stage-900">
                  <span className="min-w-0 truncate text-paper">{d.title}</span>
                  <span className="shrink-0 text-xs text-stone-500">{formatShowDateShort(d.date)}</span>
                </a>
              </li>
            ))}
      </ul>
      {list.length > LIMIT && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="btn-ghost mt-3 !px-4 !py-2 text-xs">
          {expanded ? '收合 ↑' : `顯示全部 ${list.length} 首 ↓`}
        </button>
      )}
    </div>
  );
}
