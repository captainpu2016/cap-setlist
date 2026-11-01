'use client';

import ShowFilterBar, { useShowFilter } from '@/components/ShowFilterBar';
import { filterLabel, isFiltered, matchesFilter } from '@/lib/show-filter';
import { computeStats, groupCoversByArtist, rankTopSongs, statsByCategory, type ArchiveShow } from '@/lib/stats';
import CoverLineup from './cover-lineup';
import RareSongs from './rare-songs';
import TopSongs from './top-songs';
import YearChart from './year-chart';

export type StatsShow = ArchiveShow & {
  series: string | null;
  admission: string | null;
  overseas: boolean;
  country: string | null;
  city: string | null;
};

/** 歌單統計的內容：可依分類、海外、入場方式、系列篩選，所有數字都只算篩選後的場次。預設（含搜尋引擎看到的）是全部場次 */
export default function StatsView({ shows: allShows, today }: { shows: StatsShow[]; today: string }) {
  const { filter, choose } = useShowFilter();
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
  const scope = filtered ? `「${filterLabel(filter)}」` : '';

  const sections = [
    { id: 'top', label: '常唱的歌' },
    { id: 'rare', label: '稀有的歌' },
    ...(s.coverSongs.length > 0 ? [{ id: 'covers', label: '翻唱' }] : []),
    { id: 'trend', label: '趨勢與比較' }
  ];
  // 錨點不用網址 #，因為 # 已經拿來放篩選條件
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <ShowFilterBar
        shows={allShows}
        filter={filter}
        onChange={choose}
        caption={filtered ? `以下只統計${scope}的場次：共 ${shows.length} 場，其中 ${s.showsWithSetlist} 場已公開歌單。` : undefined}
      />

      {s.showsWithSetlist === 0 ? (
        <p className="mt-10 border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">
          這個篩選條件下，還沒有已公開歌單的場次。
        </p>
      ) : (
        <>
          {/* 總覽：四個大數字 */}
          <section className="mt-8 grid grid-cols-2 gap-px border-2 border-stage-700 bg-stage-700 font-accent sm:grid-cols-4">
            {[
              ['Shows', s.showsWithSetlist, '場演出'],
              ['Songs', s.originalSongCount, '首歌'],
              ['Covers', s.coverSongCount, '首翻唱'],
              ['Avg / show', s.avgLength.toFixed(1), `歌 ${s.avgOriginal.toFixed(1)}・翻唱 ${s.avgCover.toFixed(1)}`]
            ].map(([label, value, note]) => (
              <div key={label as string} className="bg-stage-900 p-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">{label}</p>
                <p className="mt-1 text-3xl font-bold text-paper sm:text-4xl">{value}</p>
                <p className="mt-0.5 text-xs text-stone-500">{note}</p>
              </div>
            ))}
          </section>

          {/* 摘要句：給搜尋與 AI 直接引用，視覺上降到次要 */}
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-400">
            {filtered ? `${scope}` : '目前'}已公開歌單的 {s.showsWithSetlist} 場演出中，共演出 {s.originalSongCount} 首不同的歌（累計 {s.originalPlays} 首次），另外翻唱了{' '}
            {s.coverSongCount} 首（累計 {s.coverPlays} 首次），平均每場 {s.avgLength.toFixed(1)} 首
            {s.topSongs[0] && <>，最常演出的是〈{s.topSongs[0].title}〉（{s.topSongs[0].count} 場）</>}。
          </p>

          {/* 區塊導覽：長頁面直接跳到想看的地方，捲動時固定在上方 */}
          <nav aria-label="統計區塊" className="sticky top-14 z-30 -mx-6 mt-8 border-y border-stage-700 bg-stage-950/90 px-6 backdrop-blur sm:-mx-10 sm:px-10">
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

          {/* 常唱 | 稀有：電腦版左右並排 */}
          <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-10">
            <section id="top" className="min-w-0 scroll-mt-28">
              <h2 className="section-title mb-5 text-2xl">常唱的歌</h2>
              <TopSongs periods={periods} />
            </section>
            <section id="rare" className="min-w-0 scroll-mt-28">
              <h2 className="section-title mb-5 text-2xl">稀有的歌</h2>
              <RareSongs dormant={s.dormant} oneTimers={s.oneTimers} />
            </section>
          </div>

          {s.coverSongs.length > 0 && (
            <section id="covers" className="mt-16 scroll-mt-28">
              <h2 className="section-title mb-2 text-2xl">曾經翻唱過的歌</h2>
              <p className="mb-5 text-sm text-stone-500">
                共翻唱過 {s.coverSongs.length} 首、{covers.foreign.length + covers.taiwan.length} 組樂團。海外樂團在前、台灣樂團在後，同一個樂團的歌排在一起。
              </p>
              <CoverLineup foreign={covers.foreign} taiwan={covers.taiwan} />
            </section>
          )}

          {/* 趨勢與比較：每年的歌單 | 不同類型的演出 */}
          <div id="trend" className="mt-16 grid scroll-mt-28 gap-12 lg:grid-cols-2 lg:gap-10">
            <section className="min-w-0">
              <h2 className="section-title mb-5 text-2xl">每年的歌單</h2>
              <YearChart byYear={s.byYear} />
            </section>

            {byCategory.length > 0 && (
              <section className="min-w-0">
                <h2 className="section-title mb-2 text-2xl">不同類型的演出</h2>
                <p className="mb-4 text-sm text-stone-500">依演出分類比較歌單長度與翻唱比例（只算已公開歌單的場次，不受上面的篩選影響）。</p>
                <div className="-mx-1 overflow-x-auto">
                  <table className="w-full min-w-[340px] text-left text-sm">
                    <thead className="text-xs text-stone-500">
                      <tr>
                        <th className="px-1 py-2 font-normal">分類</th>
                        <th className="px-1 py-2 text-right font-normal">場數</th>
                        <th className="px-1 py-2 text-right font-normal">平均每場</th>
                        <th className="px-1 py-2 text-right font-normal">翻唱占比</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stage-700/70 border-y border-stage-700 tabular-nums">
                      {byCategory.map((r) => (
                        <tr key={r.value}>
                          <td className="px-1 py-3 font-bold text-paper">
                            <a href={`/shows#c=${r.value}`} className="hover:text-marquee">{r.label}</a>
                          </td>
                          <td className="px-1 py-3 text-right text-stone-300">{r.shows} 場</td>
                          <td className="px-1 py-3 text-right text-stone-300">{r.avgLength.toFixed(1)} 首</td>
                          <td className="px-1 py-3 text-right text-stone-300">{Math.round(r.coverShare * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}
