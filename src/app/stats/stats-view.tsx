'use client';

import ShowFilterBar, { filterLabel, useShowFilter } from '@/components/ShowFilterBar';
import { formatShowDateShort } from '@/lib/format';
import { matchesFilter } from '@/lib/show-filter';
import { computeStats, groupCoversByArtist, rankTopSongs, statsByCategory, type ArchiveShow } from '@/lib/stats';
import TopSongs from './top-songs';

export type StatsShow = ArchiveShow & {
  series: string | null;
  admission: string | null;
  overseas: boolean;
};

/** 歌單統計的內容：可依分類、海外、入場方式、系列篩選，所有數字都只算篩選後的場次。預設（含搜尋引擎看到的）是全部場次 */
export default function StatsView({ shows: allShows, today }: { shows: StatsShow[]; today: string }) {
  const { filter, admission, choose } = useShowFilter();
  const filtered = filter.kind !== 'all' || admission !== 'all';
  const shows = allShows.filter((x) => matchesFilter(x, filter, admission));

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
  const maxYearShows = Math.max(1, ...s.byYear.map((y) => y.shows));
  const scope = filtered ? `「${filterLabel(filter, admission)}」` : '';

  return (
    <>
      <ShowFilterBar
        shows={allShows}
        filter={filter}
        admission={admission}
        onChange={choose}
        caption={filtered ? `以下只統計${scope}的場次：共 ${shows.length} 場，其中 ${s.showsWithSetlist} 場已公開歌單。` : undefined}
      />

      {s.showsWithSetlist === 0 ? (
        <p className="mt-10 border border-dashed border-stage-700 p-6 text-center text-sm text-stone-500">
          這個篩選條件下，還沒有已公開歌單的場次。
        </p>
      ) : (
        <>
        {/* 摘要：給讀者，也給搜尋與 AI 直接引用 */}
        <p className="mt-6 max-w-2xl leading-relaxed text-stone-300">
          {filtered ? `${scope}` : '目前'}已公開歌單的 {s.showsWithSetlist} 場演出中，共演出 {s.originalSongCount} 首不同的歌（累計 {s.originalPlays} 首次），另外翻唱了{' '}
          {s.coverSongCount} 首（累計 {s.coverPlays} 首次），平均每場 {s.avgLength.toFixed(1)} 首
          {s.topSongs[0] && <>，最常演出的是〈{s.topSongs[0].title}〉（{s.topSongs[0].count} 場）</>}。
        </p>

        <section className="mt-8 grid grid-cols-2 gap-px border-2 border-stage-700 bg-stage-700 font-accent sm:grid-cols-4">
          {[
            ['Shows', s.showsWithSetlist, '場演出'],
            ['Songs', s.originalSongCount, '首歌'],
            ['Covers', s.coverSongCount, '首翻唱'],
            ['Avg / show', s.avgLength.toFixed(1), `歌 ${s.avgOriginal.toFixed(1)}・翻唱 ${s.avgCover.toFixed(1)}`]
          ].map(([label, value, note]) => (
            <div key={label as string} className="bg-stage-900 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-paper">{value}</p>
              <p className="mt-0.5 text-xs text-stone-500">{note}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="section-title mb-5 text-2xl">最常演出的歌</h2>
          <TopSongs periods={periods} />
        </section>

        <section className="mt-14">
          <h2 className="section-title mb-5 text-2xl">每年的歌單</h2>
          <ol className="space-y-1.5">
            {s.byYear.map((y) => (
              <li key={y.year} className="relative overflow-hidden border border-stage-700 bg-stage-900">
                <div
                  className="absolute inset-y-0 left-0 border-r-2 border-signal bg-signal opacity-25"
                  style={{ width: `${(y.shows / maxYearShows) * 100}%` }}
                  aria-hidden
                />
                <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2.5">
                  <span className="font-accent text-lg font-semibold text-paper">
                    {y.year}
                    <span className="ml-3 text-sm font-normal text-stone-300">{y.shows} 場</span>
                  </span>
                  <span className="text-xs text-stone-400">
                    平均 {y.avgLength.toFixed(1)} 首・{y.distinctSongs} 首不同的歌
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {byCategory.length > 0 && (
          <section className="mt-14">
            <h2 className="section-title mb-2 text-2xl">不同類型的演出</h2>
            <p className="mb-5 text-sm text-stone-500">依演出分類比較歌單長度與翻唱比例（只算已公開歌單的場次）。</p>
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
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

        {s.coverSongs.length > 0 && (
          <section className="mt-14">
            <h2 className="section-title mb-2 text-2xl">曾經翻唱過的歌</h2>
            <p className="mb-5 text-sm text-stone-500">
              共翻唱過 {s.coverSongs.length} 首、{covers.foreign.length + covers.taiwan.length} 組樂團。海外樂團在前、台灣樂團在後，同一個樂團的歌排在一起。
            </p>
            {[
              ['海外樂團', covers.foreign],
              ['台灣樂團', covers.taiwan]
            ].map(([label, groups]) =>
              (groups as typeof covers.foreign).length > 0 ? (
                <div key={label as string} className="mt-8 first:mt-0">
                  <h3 className="mb-1 flex items-baseline gap-3 font-accent text-xs uppercase tracking-[0.25em] text-signal">
                    {label as string}
                    <span className="text-stone-600">{(groups as typeof covers.foreign).length} 組</span>
                  </h3>
                  <ul className="border-y border-stage-700">
                    {(groups as typeof covers.foreign).map((g) => (
                      <li
                        key={g.artist}
                        className="flex flex-col gap-2 border-b border-stage-700/70 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6"
                      >
                        <p className="shrink-0 text-sm font-bold text-paper sm:w-52">{g.artist}</p>
                        <ul className="flex min-w-0 flex-wrap gap-1.5">
                          {g.songs.map((song) => (
                            <li key={song.id} className="min-w-0 max-w-full">
                              <a
                                href={`/song/${song.id}`}
                                className="block max-w-full truncate border border-stage-700 bg-stage-900 px-2.5 py-1 text-xs text-stone-300 transition-colors hover:border-marquee hover:text-marquee"
                              >
                                {song.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </section>
        )}

        {s.dormant.length > 0 && (
          <section className="mt-14">
            <h2 className="section-title mb-2 text-2xl">最久沒唱的歌</h2>
            <p className="mb-5 text-sm text-stone-500">唱過兩場以上，但最近好幾場都沒有出現。</p>
            <ol className="border-y border-stage-700">
              {s.dormant.map((d) => (
                <li key={d.id} className="border-b border-stage-700/70 last:border-b-0">
                  <a href={`/song/${d.id}`} className="flex items-center justify-between gap-4 px-2 py-3 text-sm hover:bg-stage-900">
                    <span className="min-w-0 truncate text-paper">{d.title}</span>
                    <span className="shrink-0 text-xs text-stone-500">
                      已經 {d.showsSince} 場沒唱・上次 {formatShowDateShort(d.lastDate)}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        {s.oneTimers.length > 0 && (
          <section className="mt-14">
            <h2 className="section-title mb-2 text-2xl">只唱過一次的歌</h2>
            <p className="mb-5 text-sm text-stone-500">共 {s.oneTimers.length} 首，想聽到可能要靠運氣。</p>
            <ul className="border-y border-stage-700">
              {s.oneTimers.map((d) => (
                <li key={d.id} className="border-b border-stage-700/70 last:border-b-0">
                  <a href={`/show/${d.slug}`} className="flex items-center justify-between gap-4 px-2 py-3 text-sm hover:bg-stage-900">
                    <span className="min-w-0 truncate text-paper">{d.title}</span>
                    <span className="shrink-0 text-xs text-stone-500">{formatShowDateShort(d.date)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        </>
      )}
    </>
  );
}
