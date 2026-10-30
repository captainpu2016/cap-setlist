import type { Metadata } from 'next';
import { getArchive } from '@/lib/archive';
import { computeStats, type RankedSong } from '@/lib/stats';
import { formatShowDateShort } from '@/lib/format';
import { breadcrumbJsonLd } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '歌單統計｜普通隊長最常唱的歌、開場曲與壓軸曲',
  description: '從歷年演出歌單統計：普通隊長最常演出的歌、最常開場與壓軸的歌、每年平均歌單長度，以及只唱過一次的稀有歌曲。',
  alternates: { canonical: '/stats' }
};

function Bars({ rows, accent = false }: { rows: RankedSong[]; accent?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ol className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.id}>
          <a href={`/song/${r.id}`} className="group block">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-paper transition-colors group-hover:text-marquee">
                <span className="mr-2 font-accent text-stone-600">{String(i + 1).padStart(2, '0')}</span>
                {r.title}
              </span>
              <span className="shrink-0 font-accent text-stone-400">{r.count}</span>
            </div>
            <div className="mt-1 h-1.5 bg-stage-800">
              <div className={accent ? 'h-full bg-marquee' : 'h-full bg-signal'} style={{ width: `${(r.count / max) * 100}%` }} />
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
          目前已公開歌單的 {s.showsWithSetlist} 場演出中，共演出 {s.totalSlots} 首次、{archiveStats.songCount} 首不同的歌，平均每場{' '}
          {s.avgLength.toFixed(1)} 首
          {s.topSongs[0] && <>，最常演出的是〈{s.topSongs[0].title}〉（{s.topSongs[0].count} 場）</>}。
        </p>

        <section className="mt-8 grid grid-cols-2 gap-px border-2 border-stage-700 bg-stage-700 font-accent sm:grid-cols-4">
          {[
            ['Shows', s.showsWithSetlist],
            ['Songs', archiveStats.songCount],
            ['Avg / show', s.avgLength.toFixed(1)],
            ['Total plays', s.totalSlots]
          ].map(([label, value]) => (
            <div key={label as string} className="bg-stage-900 p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-paper">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="section-title mb-5 text-2xl">最常演出的歌</h2>
          <Bars rows={s.topSongs} />
        </section>

        <section className="mt-14 grid gap-12 sm:grid-cols-2">
          <div>
            <h2 className="section-title mb-5 text-2xl">最常開場</h2>
            <Bars rows={s.openers} accent />
          </div>
          <div>
            <h2 className="section-title mb-5 text-2xl">最常壓軸</h2>
            <Bars rows={s.closers} accent />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="section-title mb-5 text-2xl">每年的歌單</h2>
          <div className="border-y border-stage-700">
            {s.byYear.map((y) => (
              <div key={y.year} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-b border-stage-700/70 py-3 last:border-b-0">
                <span className="font-accent text-lg font-semibold text-paper">{y.year}</span>
                <div className="h-2 bg-stage-800">
                  <div className="h-full bg-signal" style={{ width: `${(y.shows / maxYearShows) * 100}%` }} />
                </div>
                <span className="text-right text-xs text-stone-400">
                  {y.shows} 場・平均 {y.avgLength.toFixed(1)} 首・{y.distinctSongs} 首不同的歌
                </span>
              </div>
            ))}
          </div>
        </section>

        {s.longest && s.shortest && (
          <section className="mt-14 grid gap-6 sm:grid-cols-2">
            {[
              ['歌單最長', s.longest],
              ['歌單最短', s.shortest]
            ].map(([label, v]) => {
              const item = v as NonNullable<typeof s.longest>;
              return (
                <a key={label as string} href={`/show/${item.show.slug}`} className="card-bar block p-4">
                  <p className="font-accent text-xs uppercase tracking-[0.2em] text-signal">{label as string}</p>
                  <p className="mt-1 text-3xl font-black text-paper">
                    {item.length} <span className="text-base font-bold text-stone-400">首</span>
                  </p>
                  <p className="mt-2 truncate text-sm text-stone-300">{item.show.title}</p>
                  <p className="text-xs text-stone-500">{formatShowDateShort(item.show.date)}</p>
                </a>
              );
            })}
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
