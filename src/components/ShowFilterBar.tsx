'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMISSIONS, SHOW_CATEGORIES, admissionLabel, categoryLabel } from '@/lib/show-category';
import {
  buildHash,
  matchesMain,
  parseHash,
  type Admission,
  type Filter,
  type FilterableShow
} from '@/lib/show-filter';

/** 篩選狀態同步在網址 # 後面（#c=分類 #s=系列 #o=1 #a=付費/免費），可以直接分享；沒有伺服器往返，所以頁面照樣能被快取 */
export function useShowFilter() {
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [admission, setAdmission] = useState<Admission>('all');

  useEffect(() => {
    const apply = () => {
      const parsed = parseHash(window.location.hash);
      setFilter(parsed.filter);
      setAdmission(parsed.admission);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const choose = useCallback((next: Filter, nextAdmission: Admission) => {
    setFilter(next);
    setAdmission(nextAdmission);
    window.history.replaceState(null, '', `${window.location.pathname}${buildHash(next, nextAdmission)}`);
  }, []);

  return { filter, admission, choose };
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
        active ? 'border-signal bg-signal text-paper' : 'border-stage-700 text-stone-400 hover:border-stone-500 hover:text-paper'
      }`}
    >
      {children}
    </button>
  );
}

export function filterLabel(filter: Filter, admission: Admission): string {
  return [
    filter.kind === 'category'
      ? (categoryLabel(filter.value) ?? filter.value)
      : filter.kind === 'overseas'
        ? '海外演出'
        : filter.kind === 'series'
          ? filter.value
          : null,
    admission !== 'all' ? admissionLabel(admission) : null
  ]
    .filter(Boolean)
    .join('・');
}

/** 分類、海外、入場方式、系列的按鈕列；數字是場數 */
export default function ShowFilterBar({
  shows,
  filter,
  admission,
  onChange,
  caption
}: {
  shows: FilterableShow[];
  filter: Filter;
  admission: Admission;
  onChange: (filter: Filter, admission: Admission) => void;
  /** 篩選中時顯示在按鈕下方的說明（例如「海外演出：共 7 場」） */
  caption?: string;
}) {
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shows) if (s.category) m.set(s.category, (m.get(s.category) ?? 0) + 1);
    return m;
  }, [shows]);

  const seriesList = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shows) if (s.series) m.set(s.series, (m.get(s.series) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'));
  }, [shows]);

  const overseasCount = useMemo(() => shows.filter((s) => s.overseas).length, [shows]);
  const anyAdmission = useMemo(() => shows.some((s) => s.admission), [shows]);

  // 入場方式可以和其他篩選一起用；數字是在目前分類／系列／海外之下的場數
  const admissionCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shows) if (matchesMain(s, filter) && s.admission) m.set(s.admission, (m.get(s.admission) ?? 0) + 1);
    return m;
  }, [shows, filter]);

  if (categoryCounts.size === 0 && overseasCount === 0) return null;

  return (
    <div className="mt-8 space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="依分類篩選">
        <Chip active={filter.kind === 'all'} onClick={() => onChange({ kind: 'all' }, admission)}>
          全部 {shows.length}
        </Chip>
        {SHOW_CATEGORIES.filter((c) => categoryCounts.has(c.value)).map((c) => (
          <Chip
            key={c.value}
            active={filter.kind === 'category' && filter.value === c.value}
            onClick={() => onChange({ kind: 'category', value: c.value }, admission)}
          >
            {c.label} {categoryCounts.get(c.value)}
          </Chip>
        ))}
        {overseasCount > 0 && (
          <Chip active={filter.kind === 'overseas'} onClick={() => onChange({ kind: 'overseas' }, admission)}>
            海外 {overseasCount}
          </Chip>
        )}
      </div>
      {anyAdmission && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="依入場方式篩選">
          <span className="font-accent text-[11px] uppercase tracking-[0.25em] text-stone-500">入場</span>
          <Chip active={admission === 'all'} onClick={() => onChange(filter, 'all')}>
            不限
          </Chip>
          {ADMISSIONS.map((a) => (
            <Chip key={a.value} active={admission === a.value} onClick={() => onChange(filter, a.value)}>
              {a.label} {admissionCounts.get(a.value) ?? 0}
            </Chip>
          ))}
        </div>
      )}
      {seriesList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="依系列篩選">
          <span className="font-accent text-[11px] uppercase tracking-[0.25em] text-stone-500">系列</span>
          {seriesList.map(([name, n]) => (
            <Chip key={name} active={filter.kind === 'series' && filter.value === name} onClick={() => onChange({ kind: 'series', value: name }, admission)}>
              {name} {n}
            </Chip>
          ))}
        </div>
      )}
      {caption && <p className="text-sm text-stone-500">{caption}</p>}
    </div>
  );
}
