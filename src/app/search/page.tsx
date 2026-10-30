import { createPublicClient } from '@/lib/supabase/public';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import SongSearch, { type SearchSong } from './song-search';

export const metadata = {
  title: '搜尋歌曲｜普通隊長',
  description: '搜尋普通隊長的歌曲，找出在哪些場次唱過。'
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
  const { data } = await supabase
    .from('songs')
    .select(
      'id, title, album:albums(title), setlist_items(is_placeholder, show:shows(id, slug, title, show_date, venue, status, setlist_reveal_at))'
    )
    .returns<SongRow[]>();

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

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <BackLink />

        <div className="mt-6">
          <PageHeader eyebrow="Search" title="搜尋歌曲" description="找找看某首歌在哪些場次唱過。" />
        </div>

        <SongSearch songs={songs} initialQuery={searchParams.q?.trim() ?? ''} />
      </div>
    </main>
  );
}
