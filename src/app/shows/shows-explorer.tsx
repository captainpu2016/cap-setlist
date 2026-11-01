'use client';

import ShowFilterBar, { useShowFilter } from '@/components/ShowFilterBar';
import { admissionLabel, categoryLabel } from '@/lib/show-category';
import { filterLabel, isFiltered, matchesFilter } from '@/lib/show-filter';

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
  country: string | null;
  city: string | null;
}

/** 全部場次：依年份列出，可用分類、地區、入場方式、系列篩選（可同時使用）。預設（含搜尋引擎看到的）是全部場次 */
export default function ShowsExplorer({ shows }: { shows: ExplorerShow[] }) {
  const { filter, choose } = useShowFilter();

  const visible = shows.filter((s) => matchesFilter(s, filter));
  const groups = new Map<string, ExplorerShow[]>();
  for (const s of visible) {
    const y = s.date.slice(0, 4);
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y)!.push(s);
  }
  const years = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <ShowFilterBar
        shows={shows}
        filter={filter}
        onChange={choose}
        caption={isFiltered(filter) ? `${filterLabel(filter)}：共 ${visible.length} 場` : undefined}
      />

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
