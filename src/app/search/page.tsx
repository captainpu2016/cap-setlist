import { createPublicClient } from '@/lib/supabase/public';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import JsonLd from '@/components/JsonLd';
import { breadcrumbJsonLd } from '@/lib/seo';
import { getArchive } from '@/lib/archive';
import { getCity } from '@/lib/format';
import { admissionLabel, categoryLabel } from '@/lib/show-category';
import SongSearch, { type SearchSong, type SearchShow } from './song-search';

export const metadata = {
  alternates: { canonical: '/search' },
  title: '搜尋歌曲與場次｜普通隊長',
  description: '搜尋普通隊長的歌名、場地、城市、年份，找出唱過哪些歌、去過哪些地方。'
};

interface SongRow {
  id: string;
  title: string;
  album: { title: string } | null;
  setlist_items: {
    is_placeholder: boolean;
    show: {
      id: string;
      slug: string;
      title: string;
      show_date: string;
      venue: string | null;
      status: string;
      setlist_reveal_at: string | null;
    } | null;
  }[];
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createPublicClient();
  const [archive, { data }] = await Promise.all([getArchive(), supabase
    .from('songs')
    .select(
      'id, title, album:albums(title), setlist_items(is_placeholder, show:shows(id, slug, title, show_date, venue, status, setlist_reveal_at))'
    )
    .returns<SongRow[]>()]);

  const now = new Date();

  // 在伺服器端整理好，只把公開、已揭曉歌單的場次交給前端，避免提早洩漏尚未公開的歌單
  const songs: SearchSong[] = (data ?? [])
    .map((song) => {
      const shows = song.setlist_items
        .filter((i) => !i.is_placeholder && i.show)
        .map((i) => i.show!)
        .filter((s) => s.status === 'published' && (!s.setlist_reveal_at || new Date(s.setlist_reveal_at) <= now))
        .sort((a, b) => b.show_date.localeCompare(a.show_date))
        .map((s) => ({ id: s.id, slug: s.slug, title: s.title, date: s.show_date, venue: s.venue }));
      return { id: song.id, title: song.title, album: song.album?.title ?? null, shows };
    })
    .filter((song) => song.shows.length > 0);

  // 場次一律只給公開資訊（標題、日期、場地、分類）；關鍵字比對用的字串在這裡先組好
  const shows: SearchShow[] = archive.shows.map((sh) => {
    const city = getCity(sh.venue);
    const tags = [categoryLabel(sh.category), admissionLabel(sh.admission)].filter((t): t is string => Boolean(t));
    return {
      slug: sh.slug,
      title: sh.title,
      date: sh.date,
      venue: sh.venue,
      city,
      series: sh.series,
      tags,
      haystack: [sh.title, sh.venue, city, sh.series, sh.date, sh.date.replace(/-/g, '.'), ...tags].filter(Boolean).join(' ').toLowerCase()
    };
  });

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd data={breadcrumbJsonLd([{ name: '首頁', path: '/' }, { name: '搜尋', path: '/search' }])} />
      <div className="mx-auto max-w-2xl">
        <BackLink />

        <div className="mt-6">
          <PageHeader eyebrow="Search" title="搜尋" description="輸入歌名、場地、城市或年份，找歌曲、也找演出。可以一次輸入多個字，例如「高雄 2023」。" />
        </div>

        <SongSearch songs={songs} shows={shows} initialQuery={searchParams.q?.trim() ?? ''} />
      </div>
    </main>
  );
}
