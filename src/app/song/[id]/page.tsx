import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArchive } from '@/lib/archive';
import { formatShowDate, formatShowDateShort } from '@/lib/format';
import { breadcrumbJsonLd, getSiteUrl, musicGroupJsonLd } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const revalidate = 3600;

async function findSong(id: string) {
  const { songs } = await getArchive();
  return songs.find((s) => s.id === id) ?? null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const song = await findSong(params.id);
  if (!song) return { title: '找不到歌曲｜普通隊長' };

  const latest = song.shows[0];
  const title = `${song.title} 唱過哪些場次｜普通隊長`;
  const description = `普通隊長演出過〈${song.title}〉共 ${song.shows.length} 場，最近一次是 ${formatShowDate(latest.date)}${
    latest.venue ? `的 ${latest.venue}` : ''
  }。完整場次列表與日期。`;

  return {
    title,
    description,
    alternates: { canonical: `/song/${song.id}` },
    openGraph: { title, description, type: 'website', locale: 'zh_TW' }
  };
}

export default async function SongPage({ params }: { params: { id: string } }) {
  const song = await findSong(params.id);
  if (!song) notFound();

  const url = getSiteUrl();
  const first = song.shows[song.shows.length - 1];
  const latest = song.shows[0];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'MusicComposition',
      '@id': `${url}/song/${song.id}`,
      name: song.title,
      url: `${url}/song/${song.id}`,
      inLanguage: 'zh-Hant-TW',
      composer: { '@id': `${url}/#band` }
    },
    musicGroupJsonLd(),
    breadcrumbJsonLd([
      { name: '首頁', path: '/' },
      { name: '搜尋歌曲', path: '/search' },
      { name: song.title, path: `/song/${song.id}` }
    ])
  ];

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-2xl">
        <BackLink href="/search" label="搜尋歌曲" />

        <div className="mt-6">
          <PageHeader eyebrow="Song" title={song.title} />
        </div>

        {/* 一句話摘要：給讀者，也給搜尋與 AI 直接擷取 */}
        <p className="mt-6 max-w-xl leading-relaxed text-stone-300">
          普通隊長共演出過〈{song.title}〉<strong className="text-paper">{song.shows.length} 場</strong>，
          最早一次是 {formatShowDate(first.date)}
          {first.venue ? `（${first.venue}）` : ''}，最近一次是 {formatShowDate(latest.date)}
          {latest.venue ? `（${latest.venue}）` : ''}。
        </p>

        <section className="mt-10">
          <h2 className="section-title mb-4 text-2xl">唱過的場次</h2>
          <ol className="border-y border-stage-700">
            {song.shows.map((show) => (
              <li key={show.slug} className="border-b border-stage-700/70 last:border-b-0">
                <a
                  href={`/show/${show.slug}`}
                  className="flex items-center justify-between gap-4 px-2 py-3 text-sm transition-colors hover:bg-stage-900"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-paper">{show.title}</span>
                    {show.venue && <span className="block truncate text-xs text-stone-500">{show.venue}</span>}
                  </span>
                  <time dateTime={show.date} className="shrink-0 text-xs text-stone-500">
                    {formatShowDateShort(show.date)}
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
