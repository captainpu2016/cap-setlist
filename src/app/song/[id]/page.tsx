import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { displaySongTitle, getArchive, parseCoverTitle } from '@/lib/archive';
import { createPublicClient } from '@/lib/supabase/public';
import ListenLinks, { type ListenLink } from './listen-links';
import { formatShowDate, formatShowDateShort } from '@/lib/format';
import { getSongProfile } from '@/lib/song-insights';
import { breadcrumbJsonLd, getSiteUrl, musicGroupJsonLd } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const revalidate = 3600;

interface SongExtras {
  description: string | null;
  links: ListenLink[];
}

/** 聆聽連結與歌曲介紹不在 getArchive 裡；description 欄位要等 0004 migration 執行後才有，查不到就退回不含它的查詢 */
async function loadExtras(id: string): Promise<SongExtras> {
  const supabase = createPublicClient();
  type Row = { spotify_track_id: string | null; apple_music_url: string | null; youtube_url: string | null; description?: string | null };
  let row: Row | null = null;
  const first = await supabase
    .from('songs')
    .select('spotify_track_id, apple_music_url, youtube_url, description')
    .eq('id', id)
    .maybeSingle<Row>();
  if (!first.error) row = first.data;
  else {
    const fallback = await supabase
      .from('songs')
      .select('spotify_track_id, apple_music_url, youtube_url')
      .eq('id', id)
      .maybeSingle<Row>();
    row = fallback.data;
  }
  const links: ListenLink[] = [];
  if (row?.spotify_track_id) links.push({ platform: 'spotify', label: 'Spotify', href: `https://open.spotify.com/track/${row.spotify_track_id}` });
  if (row?.apple_music_url) links.push({ platform: 'apple_music', label: 'Apple Music', href: row.apple_music_url });
  if (row?.youtube_url) links.push({ platform: 'youtube', label: 'YouTube', href: row.youtube_url });
  return { description: row?.description?.trim() || null, links };
}

async function load(id: string) {
  const { songs, shows } = await getArchive();
  const song = songs.find((s) => s.id === id);
  if (!song) return null;
  const profile = getSongProfile(shows, id);
  return profile ? { song, profile } : null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await load(params.id);
  if (!data) return { title: '找不到歌曲｜普通隊長' };
  const { song, profile } = data;
  const name = displaySongTitle(song.title);

  if (song.isCover) {
    const c = parseCoverTitle(song.title);
    const coverTitle = `${c.name}${c.artist ? `（${c.artist}）` : ''} 翻唱｜普通隊長`;
    const coverDesc = `普通隊長翻唱${c.artist ? `${c.artist}的` : ''}〈${c.name}〉，首次演出是 ${formatShowDate(profile.first.date)}，最近一次是 ${formatShowDate(profile.last.date)}。`;
    return {
      title: coverTitle,
      description: coverDesc,
      alternates: { canonical: `/song/${song.id}` },
      openGraph: { title: coverTitle, description: coverDesc, type: 'website', locale: 'zh_TW' }
    };
  }

  const title = `${name} 唱過哪些場次｜普通隊長`;
  const description = `普通隊長演出過〈${name}〉共 ${profile.plays} 場，首次演出是 ${formatShowDate(profile.first.date)}，最近一次是 ${formatShowDate(profile.last.date)}${
    profile.last.venue ? `的 ${profile.last.venue}` : ''
  }。`;

  return {
    title,
    description,
    alternates: { canonical: `/song/${song.id}` },
    openGraph: { title, description, type: 'website', locale: 'zh_TW' }
  };
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-stage-900 p-4">
      <p className="font-accent text-[11px] uppercase tracking-[0.25em] text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-paper">{value}</p>
      {note && <p className="mt-0.5 text-xs text-stone-500">{note}</p>}
    </div>
  );
}

export default async function SongPage({ params }: { params: { id: string } }) {
  const data = await load(params.id);
  if (!data) notFound();
  const { song, profile: p } = data;

  const url = getSiteUrl();
  const name = displaySongTitle(song.title);
  const extras = await loadExtras(song.id);
  const maxYearRate = Math.max(0.01, ...p.byYear.map((y) => y.plays / y.shows));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'MusicComposition',
      '@id': `${url}/song/${song.id}`,
      name: song.title,
      url: `${url}/song/${song.id}`,
      inLanguage: 'zh-Hant-TW',
      ...(song.isCover ? {} : { composer: { '@id': `${url}/#band` } })
    },
    musicGroupJsonLd(),
    breadcrumbJsonLd([
      { name: '首頁', path: '/' },
      { name: '搜尋歌曲', path: '/search' },
      { name: name, path: `/song/${song.id}` }
    ])
  ];

  if (song.isCover) {
    const c = parseCoverTitle(song.title);
    return (
      <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
        <JsonLd data={jsonLd} />
        <div className="mx-auto max-w-2xl">
          <BackLink href="/stats" label="歌單統計" />

          <div className="mt-6">
            <PageHeader eyebrow="Cover" title={c.name} />
          </div>

          {c.artist && (
            <p className="mt-4 text-lg text-stone-300">
              原唱　<strong className="font-bold text-paper">{c.artist}</strong>
            </p>
          )}

          {extras.links.length > 0 && (
            <div className="mt-6">
              <ListenLinks links={extras.links} songTitle={song.title} />
            </div>
          )}

          {extras.description && (
            <section className="mt-10">
              <h2 className="section-title mb-4 text-2xl">關於這首歌</h2>
              <p className="max-w-xl whitespace-pre-line leading-relaxed text-stone-300">{extras.description}</p>
            </section>
          )}

          <p className="mt-10 max-w-xl leading-relaxed text-stone-400">
            普通隊長翻唱過這首歌 {p.plays} 場，首次是 {formatShowDate(p.first.date)}
            {p.last.date !== p.first.date && <>，最近一次是 {formatShowDate(p.last.date)}</>}。
          </p>

          <section className="mt-6">
            <h2 className="section-title mb-4 text-xl">翻唱過的場次</h2>
            <ol className="border-y border-stage-700">
              {p.appearances.map((a) => (
                <li key={a.slug} className="border-b border-stage-700/70 last:border-b-0">
                  <a href={`/show/${a.slug}`} className="flex items-center justify-between gap-4 px-2 py-3 text-sm transition-colors hover:bg-stage-900">
                    <span className="min-w-0">
                      <span className="block truncate text-paper">{a.title}</span>
                      {a.venue && <span className="block truncate text-xs text-stone-500">{a.venue}</span>}
                    </span>
                    <time dateTime={a.date} className="shrink-0 text-xs text-stone-500">
                      {formatShowDateShort(a.date)}
                    </time>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-2xl">
        <BackLink href="/search" label="搜尋歌曲" />

        <div className="mt-6">
          <PageHeader eyebrow={song.isCover ? 'Cover' : 'Song'} title={name} />
        </div>

        {/* 一句話摘要：給讀者，也給搜尋與 AI 直接擷取 */}
        <p className="mt-6 max-w-xl leading-relaxed text-stone-300">
          普通隊長共演出過〈{name}〉<strong className="text-paper">{p.plays} 場</strong>，首次演出是{' '}
          {formatShowDate(p.first.date)}
          {p.first.venue ? `（${p.first.venue}）` : ''}，最近一次是 {formatShowDate(p.last.date)}
          {p.last.venue ? `（${p.last.venue}）` : ''}。
        </p>

        <section className="mt-8 grid grid-cols-2 gap-px border-2 border-stage-700 bg-stage-700 sm:grid-cols-4" aria-label="這首歌的數字">
          <Stat label="Plays" value={`${p.plays}`} note="場演出" />
          <Stat label="Rate" value={`${Math.round(p.rate * 100)}%`} note={`首唱後 ${p.showsSinceFirst} 場中`} />
          <Stat label="Position" value={`${p.placement}`} note="通常排在歌單的" />
          <Stat label="Since last" value={`${p.showsSinceLast}`} note={p.showsSinceLast === 0 ? '最近一場就有唱' : '場沒唱'} />
        </section>

        {(p.openerCount > 0 || p.closerCount > 0) && (
          <p className="mt-4 text-sm text-stone-400">
            {p.openerCount > 0 && <>當過 {p.openerCount} 次開場</>}
            {p.openerCount > 0 && p.closerCount > 0 && '、'}
            {p.closerCount > 0 && <>{p.closerCount} 次壓軸</>}。
          </p>
        )}

        {p.byYear.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title mb-4 text-2xl">每年唱的頻率</h2>
            <p className="mb-4 text-sm text-stone-500">長條是「那一年的場次裡，有幾成唱了這首」。</p>
            <div className="border-y border-stage-700">
              {p.byYear.map((y) => (
                <div key={y.year} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-b border-stage-700/70 py-3 last:border-b-0">
                  <span className="font-accent text-lg font-semibold text-paper">{y.year}</span>
                  <div className="h-2 bg-stage-800">
                    <div className="h-full bg-signal" style={{ width: `${(y.plays / y.shows / maxYearRate) * 100}%` }} />
                  </div>
                  <span className="text-right text-xs text-stone-400">
                    {y.plays} / {y.shows} 場
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(p.nextSongs.length > 0 || p.prevSongs.length > 0) && (
          <section className="mt-12 grid gap-10 sm:grid-cols-2">
            {[
              ['最常接在後面', p.nextSongs],
              ['最常接在前面', p.prevSongs]
            ].map(([label, rows]) => (
              <div key={label as string}>
                <h2 className="section-title mb-4 text-xl">{label as string}</h2>
                <ol className="border-y border-stage-700">
                  {(rows as typeof p.nextSongs).map((r) => (
                    <li key={r.id} className="border-b border-stage-700/70 last:border-b-0">
                      <a href={`/song/${r.id}`} className="flex items-center justify-between gap-3 px-1 py-2.5 text-sm hover:bg-stage-900">
                        <span className="min-w-0 truncate text-paper">{displaySongTitle(r.title)}</span>
                        <span className="shrink-0 font-accent text-xs text-stone-500">{r.count} 次</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )}

        <section className="mt-12">
          <h2 className="section-title mb-4 text-2xl">唱過的場次</h2>
          <ol className="border-y border-stage-700">
            {p.appearances.map((a) => (
              <li key={a.slug} className="border-b border-stage-700/70 last:border-b-0">
                <a href={`/show/${a.slug}`} className="flex items-center justify-between gap-4 px-2 py-3 text-sm transition-colors hover:bg-stage-900">
                  <span className="min-w-0">
                    <span className="block truncate text-paper">{a.title}</span>
                    <span className="block truncate text-xs text-stone-500">
                      {a.venue ? `${a.venue}・` : ''}第 {a.position} 首 / 共 {a.total} 首
                    </span>
                  </span>
                  <time dateTime={a.date} className="shrink-0 text-xs text-stone-500">
                    {formatShowDateShort(a.date)}
                  </time>
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
