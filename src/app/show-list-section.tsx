'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Show } from '@/types/database';
import ShowTags from '@/components/ShowTags';

const COLLAPSED_COUNT = 6;
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** 票券左側的日期塊：大大的日、月份縮寫、年份與星期 */
function DateBlock({ date, accent }: { date: string; accent?: boolean }) {
  const d = new Date(date + 'T00:00:00');
  return (
    <div
      className={`flex w-16 shrink-0 flex-col items-center justify-center border-r border-dashed py-3 text-center font-accent ${
        accent ? 'border-signal/50' : 'border-stage-700'
      }`}
    >
      <span className="text-[11px] font-medium tracking-[0.2em] text-stone-500">{d.getFullYear()}</span>
      <span className="text-3xl font-bold leading-none text-paper">{String(d.getDate()).padStart(2, '0')}</span>
      <span className={`mt-1 text-xs font-semibold tracking-[0.2em] ${accent ? 'text-signal' : 'text-marquee'}`}>
        {MONTHS[d.getMonth()]}
      </span>
      <span className="mt-0.5 text-[10px] tracking-[0.2em] text-stone-600">{WEEKDAYS[d.getDay()]}</span>
    </div>
  );
}

export default function ShowListSection({
  title,
  shows,
  accent,
  collapsible,
  action
}: {
  title: string;
  shows: Show[];
  accent?: boolean;
  collapsible?: boolean;
  /** 標題列右側的小連結（例如「訂閱行事曆」） */
  action?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  if (shows.length === 0) return null;

  const shouldCollapse = collapsible && !expanded && shows.length > COLLAPSED_COUNT;
  const visibleShows = shouldCollapse ? shows.slice(0, COLLAPSED_COUNT) : shows;

  return (
    <div className="mb-14">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-t-2 border-paper pt-3">
        <h2 className="text-2xl font-black text-paper">{title}</h2>
        <span className="flex items-baseline gap-4">
          {action}
          <span className="font-accent text-sm tracking-widest text-stone-500">{shows.length}</span>
        </span>
      </div>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleShows.map((show, i) => (
          <li key={show.id}>
            <Link href={`/show/${show.slug}`} className="card-bar group flex h-full flex-col overflow-hidden">
              {show.cover_image_url && (
                <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden">
                  <Image
                    src={show.cover_image_url}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stage-900 via-transparent to-transparent" />
                  {accent && i === 0 && <span className="tag-solid absolute left-3 top-3">Next</span>}
                </div>
              )}

              <div className="flex flex-1">
                <DateBlock date={show.show_date} accent={accent} />
                <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                  {accent && i === 0 && !show.cover_image_url && (
                    <span className="tag-solid mb-2 self-start">Next</span>
                  )}
                  <h3 className="break-words text-base font-black leading-snug text-paper transition-colors group-hover:text-marquee">
                    {show.title}
                  </h3>
                  {show.venue && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-400">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0 text-signal">
                        <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z" />
                      </svg>
                      <span className="truncate">{show.venue}</span>
                    </p>
                  )}
                  <ShowTags show={show} className="mt-2" />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {shouldCollapse && (
        <button type="button" onClick={() => setExpanded(true)} className="btn-ghost mt-6 w-full sm:w-auto">
          顯示全部 {shows.length} 場 ↓
        </button>
      )}
    </div>
  );
}
