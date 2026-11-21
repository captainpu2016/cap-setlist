'use client';

import { isFiltered, matchesFilter } from '@/lib/show-filter';
import { computeStats, groupCoversByArtist, rankTopSongs, statsByCategory, type ArchiveShow } from '@/lib/stats';
import CategoryBars from './category-bars';
import CoverLineup from './cover-lineup';
import TopSongs from './top-songs';
import YearChart from './year-chart';
import { useStatsFilter } from './stats-shell';
import YearCompare from './year-compare';

export type StatsShow = ArchiveShow & {
  series: string | null;
  admission: string | null;
  overseas: boolean;
  country: string | null;
  city: string | null;
};

/** 歌單統計的內容：可依分類、海外、入場方式、系列篩選，所有數字都只算篩選後的場次。預設（含搜尋引擎看到的）是全部場次 */
export default function StatsView({ shows: allShows, today }: { shows: StatsShow[]; today: string }) {
  const filter = useStatsFilter();
  const filtered = isFiltered(filter);
  const shows = allShows.filter((x) => matchesFilter(x, filter));

  const s = computeStats(shows);
  const monthsAgo = (n: number) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - n);
    return d.toISOString().slice(0, 10);
  };
  const periods = [
    { key: '3m', label: '近三個月', since: monthsAgo(3) },
    { key: '1y', label: '近一年', since: monthsAgo(12) },
    { key: 'all', label: '全部', since: null }
  ].map(({ since, ...p }) => ({ ...p, ...rankTopSongs(shows, since, 10) }));
  const covers = groupCoversByArtist(s.coverSongs);
  const byCategory = statsByCategory(allShows); // 分類比較表永遠看全部場次，不受上面的篩選影響

  const sections = [
    { id: 'top', label: '常唱的歌' },
    { id: 'trend', label: '趨勢與比較' },
    { id: 'compare', label: '年度比較' },
    ...(s.coverSongs.length > 0 ? [{ id: 'covers', label: '曾經翻唱過的歌' }] : [])
  ];
  // 錨點不用網址 #，因為 # 已經拿來放篩選條件
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      {s.showsWithSetlist === 0 ? (
        <p className="mt-10 border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">
          這個篩選條件下，還沒有已公開歌單的場次。
        </p>
      ) : (
        <>
          {/* 區塊導覽：長頁面直接跳到想看的地方，捲動時固定在上方 */}
          <nav aria-label="統計區塊" className="sticky top-14 z-30 -mx-6 mt-10 border-y border-stage-700 bg-stage-950/90 px-6 backdrop-blur sm:-mx-10 sm:px-10">
            <ul className="flex gap-1 overflow-x-auto py-2">
              {sections.map((x) => (
                <li key={x.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => jump(x.id)}
                    className="px-3 py-1.5 font-accent text-xs font-semibold uppercase tracking-[0.15em] text-stone-400 transition-colors hover:text-marquee"
                  >
                    {x.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <section id="top" className="mt-12 scroll-mt-28">
            <h2 className="section-title mb-5 text-2xl">常唱的歌</h2>
            <TopSongs periods={periods} />
          </section>

          {/* 趨勢與比較：每年的歌單 | 不同類型的演出 */}
          <div id="trend" className="mt-16 grid scroll-mt-28 gap-12 lg:grid-cols-2 lg:gap-10">
            <section className="min-w-0">
              <h2 className="section-title mb-5 text-2xl">每年的歌單</h2>
              <YearChart byYear={s.byYear} />
            </section>

            {byCategory.length > 0 && (
              <section className="min-w-0">
                <h2 className="section-title mb-2 text-2xl">不同類型的演出</h2>
                <p className="mb-4 text-sm text-stone-500">長條是各類型的演出場數；名稱下方是平均每場首數與翻唱占比（只算已公開歌單的場次，不受上面的篩選影響）。</p>
                <CategoryBars rows={byCategory} />
              </section>
            )}
          </div>

          {/* 年度比較：自選兩個期間，不受上面的篩選影響 */}
          <section id="compare" className="mt-16 scroll-mt-28">
            <h2 className="section-title mb-2 text-2xl">年度比較</h2>
            <p className="mb-5 text-sm text-stone-500">自己選兩個年份（或「全部」），比較演出場次、歌曲、城市，以及演出類型的比例變化（不受上方篩選影響）。</p>
            <YearCompare shows={allShows} today={today} />
          </section>

          {/* 曾經翻唱過的歌放在最後 */}
          {s.coverSongs.length > 0 && (
            <section id="covers" className="mt-16 scroll-mt-28">
              <h2 className="section-title mb-2 text-2xl">曾經翻唱過的歌</h2>
              <p className="mb-5 text-sm text-stone-500">
                共翻唱過 {s.coverSongs.length} 首、{covers.foreign.length + covers.taiwan.length} 組樂團，同一個樂團的歌排在一起。
              </p>
              <CoverLineup foreign={covers.foreign} taiwan={covers.taiwan} />
            </section>
          )}
        </>
      )}
    </>
  );
}
