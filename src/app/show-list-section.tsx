'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatShowDateShort } from '@/lib/format';
import type { Show } from '@/types/database';

const COLLAPSED_COUNT = 6;

export default function ShowListSection({
  title,
  shows,
  accent,
  collapsible
}: {
  title: string;
  shows: Show[];
  accent?: boolean;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (shows.length === 0) return null;

  const shouldCollapse = collapsible && !expanded && shows.length > COLLAPSED_COUNT;
  const visibleShows = shouldCollapse ? shows.slice(0, COLLAPSED_COUNT) : shows;

  return (
    <div className="mb-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-stone-300">{title}</h2>
        <span className="text-xs text-stone-600">{shows.length} 場</span>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleShows.map((show) => (
          <li key={show.id}>
            <Link
              href={`/show/${show.slug}`}
              className={`group flex h-full flex-col rounded-lg border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${
                accent
                  ? 'border-marquee/40 bg-stage-900 hover:border-marquee'
                  : 'border-stage-700 bg-stage-900/60 hover:border-stone-500'
              }`}
            >
              <p className="text-xs uppercase tracking-widest text-stone-500">
                {formatShowDateShort(show.show_date)}
              </p>
              <h3 className="mt-2 font-display text-xl font-bold text-paper group-hover:text-marquee">
                {show.title}
              </h3>
              {show.venue && <p className="mt-1 text-sm text-stone-400">{show.venue}</p>}

              <div className="mt-auto flex items-center justify-between pt-4">
                {show.spotify_playlist_url ? (
                  <span className="inline-block rounded-full bg-signal/20 px-3 py-1 text-xs text-signal">
                    已有播放清單
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-stone-600 transition group-hover:translate-x-0.5 group-hover:text-marquee">
                  →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {shouldCollapse && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-5 text-xs uppercase tracking-widest text-stone-500 hover:text-marquee"
        >
          顯示全部 {shows.length} 場 ↓
        </button>
      )}
    </div>
  );
}
