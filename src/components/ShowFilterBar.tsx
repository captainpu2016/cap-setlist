'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMISSIONS, SHOW_CATEGORIES } from '@/lib/show-category';
import { sortCitiesNorthToSouth } from '@/lib/geo';
import {
  EMPTY_FILTER,
  buildHash,
  filterLabel,
  isFiltered,
  parseHash,
  type FilterableShow,
  type ShowFilter
} from '@/lib/show-filter';

export { filterLabel };

/** 篩選狀態同步在網址 # 後面（#c=分類 #s=系列 #o=1 #a=free），可以直接分享；沒有伺服器往返，所以頁面照樣能被快取 */
export function useShowFilter() {
  const [filter, setFilter] = useState<ShowFilter>(EMPTY_FILTER);

  useEffect(() => {
    const apply = () => setFilter(parseHash(window.location.hash));
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const choose = useCallback((next: ShowFilter) => {
    setFilter(next);
    window.history.replaceState(null, '', `${window.location.pathname}${buildHash(next)}`);
  }, []);

  return { filter, choose };
}

function Field({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const active = value !== '';
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-accent text-[11px] uppercase tracking-[0.25em] text-stone-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border-2 bg-stage-900 px-3 py-2 text-sm font-bold text-paper transition-colors focus:border-signal focus:outline-none ${
          active ? 'border-signal' : 'border-stage-700 hover:border-stone-500'
        }`}
      >
        {children}
      </select>
    </label>
  );
}

/** 篩選列（由左到右）：分類、入場、國家，選了國家之後多一個城市；可以同時使用 */
export default function ShowFilterBar({
  shows,
  filter,
  onChange,
  caption
}: {
  shows: FilterableShow[];
  filter: ShowFilter;
  onChange: (filter: ShowFilter) => void;
  /** 篩選中時顯示在選單下方的說明（例如「日本：共 7 場」） */
  caption?: string;
}) {
  const categories = useMemo(() => {
    const present = new Set(shows.map((s) => s.category).filter(Boolean));
    return SHOW_CATEGORIES.filter((c) => present.has(c.value));
  }, [shows]);
  const hasAdmission = useMemo(() => shows.some((s) => s.admission), [shows]);

  // 出現過的國家：台灣在前，其他依場次數
  const countries = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shows) if (s.country) m.set(s.country, (m.get(s.country) ?? 0) + 1);
    return Array.from(m.entries())
      .sort((a, b) => (a[0] === '台灣' ? -1 : b[0] === '台灣' ? 1 : b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant')))
      .map(([name]) => name);
  }, [shows]);

  // 目前選的國家底下出現過的城市，由北到南
  const cities = useMemo(() => {
    if (!filter.country) return [];
    const m = new Set<string>();
    for (const s of shows) if (s.country === filter.country && s.city) m.add(s.city);
    return sortCitiesNorthToSouth(Array.from(m));
  }, [shows, filter.country]);

  if (categories.length === 0 && countries.length < 2) return null;

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.length > 0 && (
          <Field label="分類" value={filter.category ?? ''} onChange={(v) => onChange({ ...filter, category: v || null })}>
            <option value="">全部</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Field>
        )}
        {hasAdmission && (
          <Field label="入場" value={filter.admission === 'all' ? '' : filter.admission} onChange={(v) => onChange({ ...filter, admission: (v || 'all') as ShowFilter['admission'] })}>
            <option value="">不限</option>
            {ADMISSIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Field>
        )}
        {countries.length > 1 && (
          <Field label="國家" value={filter.country ?? ''} onChange={(v) => onChange({ ...filter, country: v || null, city: null })}>
            <option value="">全部</option>
            {countries.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Field>
        )}
        {cities.length > 0 && (
          <Field label="城市" value={filter.city ?? ''} onChange={(v) => onChange({ ...filter, city: v || null })}>
            <option value="">全部城市</option>
            {cities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Field>
        )}
      </div>
      {(isFiltered(filter) || caption) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-stone-500">
          {caption}
          {isFiltered(filter) && (
            <button type="button" onClick={() => onChange(EMPTY_FILTER)} className="text-xs underline underline-offset-2 hover:text-paper">
              清除篩選
            </button>
          )}
        </p>
      )}
    </div>
  );
}
