import type { Metadata } from 'next';
import { displaySongTitle, getArchive } from '@/lib/archive';
import { computeStats, type RankedSong } from '@/lib/stats';
import { formatShowDateShort } from '@/lib/format';
import { breadcrumbJsonLd } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '歌單統計｜普通隊長最常唱的歌、翻唱過的歌與每年歌單',
  description: '從歷年演出歌單統計：普通隊長最常演出的歌、曾經翻唱過的歌、每年平均歌單長度、最久沒唱的歌，以及只唱過一次的稀有歌曲。',
  alternates: { canonical: '/stats' }
};

/** 排行：長條畫在整列後面，歌名直接壓在上面，第一名顏色加深；一眼看得出差距又不會有細線的單薄感 */
function Bars({ rows, accent = false }: { rows: RankedSong[]; accent?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const fill = accent ? 'bg-marquee' : 'bg-signal';
  const cap = accent ? 'border-marquee' : 'border-signal';
  return (
    <ol className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={r.id}>
          <a href={`/song/${r.id}`} className="group relative block overflow-hidden border border-stage-700 bg-stage-900 transition-colors hover:border-stone-500">
            <div
              className={`absolute inset-y-0 left-0 border-r-2 ${cap} ${fill} ${i === 0 ? 'opacity-45' : 'opacity-25'}`}
              style={{ width: `${(r.count / max) * 100}%` }}
              aria-hidden
            />
            <div className="relative flex items-center gap-3 px-3 py-2.5">
              <span className={`w-6 shrink-0 font-accent text-sm ${i === 0 ? (accent ? 'text-marquee' : 'text-signal') : 'text-stone-500'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm ${i === 0 ? 'font-bold' : 'font-medium'} text-paper`}>
                {displaySongTitle(r.title)}
              </span>
              <span className="shrink-0 font-accent text-base font-semibold text-paper">
                {r.count}
                <span className="ml-0.5 text-[11px] font-normal text-stone-400"> 次</span>
              </span>
            </div>
          </a>
        </li>
      ))}
    </ol>
  );
}

export default async function StatsPage() {
  const { shows, stats: archiveStats } = await getArchive();
  const s = computeStats(shows);
  const maxYearShows = Math.max(1, ...s.byYear.map((y) => y.shows));

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '歌單統計', path: '/stats' }])} />
      <div className="mx-auto max-w-3xl">
        <BackLink />
        <div className="mt-6">
          <PageHeader eyebrow="Stats" title="歌單統計" description="把每一場的歌單加起來，看看普通隊長的現場到底都唱些什麼。" />
        </div>

        {/* 摘要：給讀者，也給搜尋與 AI 直接引用 */}
        <p className="mt-6 max-w-2xl leading-relaxed text-stone-300">
          目前已公開歌單的 {s.showsWithSetlist} 場演出中，共演出 {s.originalSongCount} 首不同的歌（累計 {s.originalPlays} 首次），另外翻唱了{' '}
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
          <Bars rows={s.topSongs} />
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

        {s.coverSongs.length > 0 && (
          <section className="mt-14">
            <h2 className="section-title mb-2 text-2xl">曾經翻唱過的歌</h2>
            <p className="mb-5 text-sm text-stone-500">
              共翻唱過 {s.coverSongs.length} 首，最近唱的排在前面；括號內是原唱樂團。
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {s.coverSongs.map((c) => (
                <li key={c.id} className="min-w-0">
                  <a
                    href={`/song/${c.id}`}
                    className="block truncate border border-stage-700 border-l-2 border-l-marquee bg-stage-900 px-3 py-2.5 text-sm font-medium text-paper transition-colors hover:border-stone-500 hover:border-l-marquee hover:text-marquee"
                  >
                    {displaySongTitle(c.title)}
                  </a>
                </li>
              ))}
            </ul>
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
      </div>
    </main>
  );
}
