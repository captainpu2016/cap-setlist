import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatDuration, formatShowDate, sumDuration } from '@/lib/format';
import type { Show, SetlistItemWithSong } from '@/types/database';
import CaptainBadge from '@/components/CaptainBadge';
import ShareButton from '@/components/ShareButton';
import Setlist from './setlist';

// 生成 Spotify 播放清單的功能先隱藏（Spotify Development Mode 限制，見對話紀錄）。
// 後端邏輯都還在 src/app/api/shows/[id]/generate-playlist/、
// src/app/show/[slug]/generate-playlist-button.tsx，之後申請過 Extended Quota
// Mode 或決定付費升級 Premium 帳號後，把下面這行 import 跟 JSX 區塊復原即可。
// import GeneratePlaylistButton from './generate-playlist-button';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: show } = await supabase
    .from('shows')
    .select('title, show_date, venue')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single<Pick<Show, 'title' | 'show_date' | 'venue'>>();

  if (!show) return { title: '找不到場次｜普通隊長' };

  const title = `${show.title}｜普通隊長`;
  const description = `${formatShowDate(show.show_date)}${show.venue ? ` @ ${show.venue}` : ''} 演出歌單`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' }
  };
}

export default async function ShowPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: show } = await supabase
    .from('shows')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single<Show>();

  if (!show) notFound();

  const { data: items } = await supabase
    .from('setlist_items')
    .select('*, song:songs(*)')
    .eq('show_id', show.id)
    .order('position', { ascending: true })
    .returns<SetlistItemWithSong[]>();

  const setlist = items ?? [];
  const totalSeconds = sumDuration(setlist.map((i) => i.song?.duration_seconds ?? null));

  return (
    <main className="min-h-screen bg-noise bg-halftone">
      {show.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={show.cover_image_url}
          alt={`${show.title} 演出照片`}
          className="h-[36vh] w-full object-cover sm:h-[46vh]"
        />
      )}

      <div className="px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <a href="/" className="text-xs uppercase tracking-widest text-stone-500 hover:text-marquee">
            ← 返回場次列表
          </a>

          <div className="mt-6 flex items-start gap-4">
            <CaptainBadge size={56} rotate={-4} className="mt-1 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-marquee">{formatShowDate(show.show_date)}</p>
              <h1 className="mt-2 font-display text-3xl font-black text-paper sm:text-5xl">{show.title}</h1>
              {show.venue && <p className="mt-2 text-stone-400">{show.venue}</p>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-500">
            <span>{setlist.length} 首歌</span>
            {totalSeconds > 0 && <span>· 約 {formatDuration(totalSeconds)}</span>}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ShareButton title={show.title} />
          </div>

          <div className="mt-10">
            <Setlist items={setlist} />
          </div>

          {setlist.length === 0 && (
            <p className="mt-10 text-center text-stone-500">歌單準備中，敬請期待。</p>
          )}
        </div>
      </div>
    </main>
  );
}
