import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatDuration, formatShowDate, sumDuration } from '@/lib/format';
import type { Show, SetlistItemWithSong } from '@/types/database';
import CaptainBadge from '@/components/CaptainBadge';
import ShareButton from '@/components/ShareButton';
import AddToCalendarButton from '@/components/AddToCalendarButton';
import ShareCardButton from '@/components/ShareCardButton';
import BackLink from '@/components/BackLink';
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
    .select('title, show_date, venue, cover_image_url')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single<Pick<Show, 'title' | 'show_date' | 'venue' | 'cover_image_url'>>();

  if (!show) return { title: '找不到場次｜普通隊長' };

  const title = `${show.title}｜普通隊長`;
  const description = `${formatShowDate(show.show_date)}${show.venue ? ` @ ${show.venue}` : ''} 演出歌單`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: show.cover_image_url ? [show.cover_image_url] : undefined
    }
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

  const [{ data: items }, { data: prevShow }, { data: nextShow }] = await Promise.all([
    supabase
      .from('setlist_items')
      .select('*, song:songs(*)')
      .eq('show_id', show.id)
      .order('position', { ascending: true })
      .returns<SetlistItemWithSong[]>(),
    supabase
      .from('shows')
      .select('slug, title')
      .eq('status', 'published')
      .lt('show_date', show.show_date)
      .order('show_date', { ascending: false })
      .limit(1)
      .maybeSingle<Pick<Show, 'slug' | 'title'>>(),
    supabase
      .from('shows')
      .select('slug, title')
      .eq('status', 'published')
      .gt('show_date', show.show_date)
      .order('show_date', { ascending: true })
      .limit(1)
      .maybeSingle<Pick<Show, 'slug' | 'title'>>()
  ]);

  const setlist = items ?? [];
  const totalSeconds = sumDuration(setlist.map((i) => i.song?.duration_seconds ?? null));

  // 歌單有沒有公開：沒設定公開時間就直接顯示；有設定的話，要等時間到了才顯示
  const isRevealed = !show.setlist_reveal_at || new Date(show.setlist_reveal_at) <= new Date();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000';
  const showUrl = `${siteUrl}/show/${show.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: show.title,
    startDate: show.show_date,
    url: showUrl,
    ...(show.venue ? { location: { '@type': 'Place', name: show.venue } } : {}),
    ...(show.cover_image_url ? { image: [show.cover_image_url] } : {}),
    performer: { '@type': 'MusicGroup', name: '普通隊長' }
  };

  return (
    <main className="min-h-screen bg-noise bg-halftone">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
          <BackLink />

          <div className="mt-6 flex items-start gap-4">
            <CaptainBadge size={56} rotate={-4} className="mt-1 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-marquee">{formatShowDate(show.show_date)}</p>
              <h1 className="mt-2 font-display text-3xl font-black text-paper sm:text-5xl">{show.title}</h1>
              {show.venue && <p className="mt-2 text-stone-400">{show.venue}</p>}
            </div>
          </div>

          {isRevealed && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-500">
              <span>{setlist.length} 首歌</span>
              {totalSeconds > 0 && <span>· 約 {formatDuration(totalSeconds)}</span>}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ShareButton title={show.title} />
            <AddToCalendarButton title={show.title} dateStr={show.show_date} venue={show.venue} url={showUrl} />
            <ShareCardButton slug={show.slug} title={show.title} />
          </div>

          <div className="mt-10">
            {isRevealed ? (
              setlist.length > 0 ? (
                <Setlist items={setlist} />
              ) : (
                <p className="text-center text-stone-500">歌單準備中，敬請期待。</p>
              )
            ) : (
              <div className="rounded-lg border border-dashed border-stage-700 p-8 text-center">
                <p className="font-display text-lg text-paper">歌單敬請期待</p>
                <p className="mt-2 text-sm text-stone-500">
                  這場的歌單將於{' '}
                  {new Date(show.setlist_reveal_at as string).toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{' '}
                  公開，先加入行事曆別錯過吧。
                </p>
              </div>
            )}
          </div>

          {(prevShow || nextShow) && (
            <div className="mt-12 flex items-center justify-between border-t border-stage-700 pt-6 text-sm">
              {prevShow ? (
                <a href={`/show/${prevShow.slug}`} className="min-w-0 text-stone-400 hover:text-marquee">
                  <span className="block text-xs uppercase tracking-widest text-stone-600">← 上一場</span>
                  <span className="block truncate">{prevShow.title}</span>
                </a>
              ) : (
                <span />
              )}
              {nextShow ? (
                <a href={`/show/${nextShow.slug}`} className="min-w-0 text-right text-stone-400 hover:text-marquee">
                  <span className="block text-xs uppercase tracking-widest text-stone-600">下一場 →</span>
                  <span className="block truncate">{nextShow.title}</span>
                </a>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
