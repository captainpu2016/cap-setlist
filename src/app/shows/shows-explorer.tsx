'use client';

import { useEffect, useMemo, useState } from 'react';
import { ADMISSIONS, SHOW_CATEGORIES, admissionLabel, categoryLabel } from '@/lib/show-category';

export interface ExplorerShow {
  id: string;
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  dateLabel: string;
  venue: string | null;
  category: string | null;
  series: string | null;
  admission: string | null;
  overseas: boolean;
}

type Filter = { kind: 'all' } | { kind: 'category'; value: string } | { kind: 'series'; value: string } | { kind: 'overseas' };

type Admission = 'all' | 'paid' | 'free';

function parseHash(hash: string): { filter: Filter; admission: Admission } {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const a = p.get('a');
  const admission: Admission = a === 'paid' || a === 'free' ? a : 'all';
  if (p.get('o')) return { filter: { kind: 'overseas' }, admission };
  if (p.get('c')) return { filter: { kind: 'category', value: p.get('c')! }, admission };
  if (p.get('s')) return { filter: { kind: 'series', value: p.get('s')! }, admission };
  return { filter: { kind: 'all' }, admission };
}

function buildHash(filter: Filter, admission: Admission): string {
  const p = new URLSearchParams();
  if (filter.kind === 'category') p.set('c', filter.value);
  else if (filter.kind === 'series') p.set('s', filter.value);
  else if (filter.kind === 'overseas') p.set('o', '1');
  if (admission !== 'all') p.set('a', admission);
  const q = p.toString();
  return q ? `#${q}` : '';
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

/** 全部場次：依年份列出，可用分類或系列篩選。預設（含搜尋引擎看到的）是全部場次；網址 #c=分類 或 #s=系列 可直接帶入篩選 */
export default function ShowsExplorer({ shows }: { shows: ExplorerShow[] }) {
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

  function choose(next: Filter, nextAdmission: Admission = admission) {
    setFilter(next);
    setAdmission(nextAdmission);
    window.history.replaceState(null, '', `${window.location.pathname}${buildHash(next, nextAdmission)}`);
  }

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

  const hasCategories = categoryCounts.size > 0;
  const overseasCount = useMemo(() => shows.filter((s) => s.overseas).length, [shows]);

  const matchesMain = (s: ExplorerShow) => {
    if (filter.kind === 'category') return s.category === filter.value;
    if (filter.kind === 'series') return s.series === filter.value;
    if (filter.kind === 'overseas') return s.overseas;
    return true;
  };

  // 入場方式（付費、免費）可以和其他篩選一起用；數字是在目前分類／系列／海外之下的場數
  const admissionCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shows) if (matchesMain(s) && s.admission) m.set(s.admission, (m.get(s.admission) ?? 0) + 1);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shows, filter]);
  const anyAdmission = useMemo(() => shows.some((s) => s.admission), [shows]);

  const visible = shows.filter((s) => matchesMain(s) && (admission === 'all' || s.admission === admission));

  const groups = new Map<string, ExplorerShow[]>();
  for (const s of visible) {
    const y = s.date.slice(0, 4);
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y)!.push(s);
  }
  const years = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      {hasCategories && (
        <div className="mt-8 space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="依分類篩選">
            <Chip active={filter.kind === 'all'} onClick={() => choose({ kind: 'all' })}>
              全部 {shows.length}
            </Chip>
            {SHOW_CATEGORIES.filter((c) => categoryCounts.has(c.value)).map((c) => (
              <Chip
                key={c.value}
                active={filter.kind === 'category' && filter.value === c.value}
                onClick={() => choose({ kind: 'category', value: c.value })}
              >
                {c.label} {categoryCounts.get(c.value)}
              </Chip>
            ))}
            {overseasCount > 0 && (
              <Chip active={filter.kind === 'overseas'} onClick={() => choose({ kind: 'overseas' })}>
                海外 {overseasCount}
              </Chip>
            )}
          </div>
          {anyAdmission && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="依入場方式篩選">
              <span className="font-accent text-[11px] uppercase tracking-[0.25em] text-stone-500">入場</span>
              <Chip active={admission === 'all'} onClick={() => choose(filter, 'all')}>
                不限
              </Chip>
              {ADMISSIONS.map((a) => (
                <Chip key={a.value} active={admission === a.value} onClick={() => choose(filter, a.value)}>
                  {a.label} {admissionCounts.get(a.value) ?? 0}
                </Chip>
              ))}
            </div>
          )}
          {seriesList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="依系列篩選">
              <span className="font-accent text-[11px] uppercase tracking-[0.25em] text-stone-500">系列</span>
              {seriesList.map(([name, n]) => (
                <Chip key={name} active={filter.kind === 'series' && filter.value === name} onClick={() => choose({ kind: 'series', value: name })}>
                  {name} {n}
                </Chip>
              ))}
            </div>
          )}
          {(filter.kind !== 'all' || admission !== 'all') && (
            <p className="text-sm text-stone-500">
              {[
                filter.kind === 'category' ? categoryLabel(filter.value) ?? filter.value : filter.kind === 'overseas' ? '海外演出' : filter.kind === 'series' ? filter.value : null,
                admission !== 'all' ? admissionLabel(admission) : null
              ]
                .filter(Boolean)
                .join('・')}
              ：共 {visible.length} 場
            </p>
          )}
        </div>
      )}

      <div className="mt-10 space-y-10">
        {years.map((year) => (
          <section key={year}>
            <h2 className="section-title mb-3 font-accent text-2xl tracking-wider">{year}</h2>
            <ul className="divide-y divide-stage-700 border-2 border-stage-700 bg-stage-900">
              {(groups.get(year) ?? []).map((show) => (
                <li key={show.id}>
                  <a
                    href={`/show/${show.slug}`}
                    className="flex flex-col gap-1 px-4 py-3 text-sm transition-colors hover:bg-stage-800 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-4"
                  >
                    <span className="min-w-0 break-words text-paper">
                      {show.title}
                      {show.overseas && (
                        <span className="ml-2 inline-block border border-signal/60 px-1.5 py-px align-middle text-[10px] text-signal">海外</span>
                      )}
                      {(categoryLabel(show.category) || admissionLabel(show.admission)) && (
                        <span className="ml-2 inline-block border border-stage-700 px-1.5 py-px align-middle text-[10px] text-stone-500">
                          {[categoryLabel(show.category), admissionLabel(show.admission)].filter(Boolean).join('・')}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 break-words text-xs text-stone-500 sm:max-w-[45%] sm:shrink-0 sm:text-right">
                      {show.dateLabel}
                      {show.venue ? `・${show.venue}` : ''}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {visible.length === 0 && <p className="text-sm text-stone-500">這個分類還沒有場次。</p>}
      </div>
    </div>
  );
}
