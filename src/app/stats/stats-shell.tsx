'use client';

import Link from 'next/link';
import { createContext, useContext, type ReactNode } from 'react';
import BackLink from '@/components/BackLink';
import ShowFilterBar, { CategoryTabs, useShowFilter } from '@/components/ShowFilterBar';
import { buildHash, filterLabel, isFiltered, matchesFilter, type ShowFilter } from '@/lib/show-filter';
import type { FilterShow } from '@/lib/stats-shows';

const FilterContext = createContext<ShowFilter | null>(null);

/** 統計頁與巡演頁共用的篩選條件（由外殼提供） */
export function useStatsFilter(): ShowFilter {
  const f = useContext(FilterContext);
  if (!f) throw new Error('useStatsFilter 必須在 StatsShell 裡使用');
  return f;
}

const TABS = [
  { key: 'stats', href: '/stats', label: '歌單統計' },
  { key: 'tour', href: '/tour', label: '巡演足跡' }
] as const;

/**
 * 「統計」的共用外殼：上方兩個分頁（歌單統計／巡演足跡，各自保留網址）、同一組篩選列。
 * 兩個分頁共用同一份篩選條件：切換分頁時會把條件帶過去（放在網址 # 後面），數字與文字都用同一套規則。
 */
export default function StatsShell({
  active,
  description,
  filterShows,
  children
}: {
  active: (typeof TABS)[number]['key'];
  description: string;
  filterShows: FilterShow[];
  children: ReactNode;
}) {
  const { filter, choose } = useShowFilter();
  const filtered = isFiltered(filter);
  const matched = filterShows.filter((s) => matchesFilter(s, filter)).length;
  const hash = buildHash(filter);

  return (
    <FilterContext.Provider value={filter}>
      <BackLink />
      <div className="mt-6">
        <p className="tag-slash">Stats</p>
        <nav aria-label="統計分頁" className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          {TABS.map((t) =>
            t.key === active ? (
              <h1 key={t.key} className="text-5xl font-black leading-none tracking-tight text-paper sm:text-7xl">
                {t.label}
              </h1>
            ) : (
              <Link
                key={t.key}
                href={`${t.href}${hash}`}
                className="text-2xl font-black leading-none tracking-tight text-stone-500 underline-offset-8 transition-colors hover:text-paper hover:underline sm:text-3xl"
              >
                {t.label} →
              </Link>
            )
          )}
        </nav>
        <p className="mt-5 max-w-lg text-stone-400">{description}</p>
      </div>

      <CategoryTabs shows={filterShows} filter={filter} onChange={choose} />
      <ShowFilterBar
        shows={filterShows}
        filter={filter}
        onChange={choose}
        withPeriod
        caption={filtered ? `以下只統計「${filterLabel(filter)}」的場次：共 ${matched} 場。` : undefined}
      />

      {children}
    </FilterContext.Provider>
  );
}
