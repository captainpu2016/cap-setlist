import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { createPublicClient } from '@/lib/supabase/public';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateTimeTW, formatDuration, formatShowDate, getCity, sumDuration, todayTaipei } from '@/lib/format';
import { getArchive } from '@/lib/archive';
import { breadcrumbJsonLd, getSiteUrl } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import type { Show, SetlistItemWithSong } from '@/types/database';
import CaptainBadge from '@/components/CaptainBadge';
import ShareButton from '@/components/ShareButton';
import AddToCalendarButton from '@/components/AddToCalendarButton';
import ShareCardButton from '@/components/ShareCardButton';
import AttendButton from '@/components/AttendButton';
import BackLink from '@/components/BackLink';
import Setlist from './setlist';
import ShowComments, { type CommentItem } from './show-comments';

// 生成 Spotify 播放清單的功能先隱藏（Spotify Development Mode 限制，見對話紀錄）。
// 後端邏輯都還在 src/app/api/shows/[id]/generate-playlist/、
// src/app/show/[slug]/generate-playlist-button.tsx，之後申請過 Extended Quota
// Mode 或決定付費升級 Premium 帳號後，把下面這行 import 跟 JSX 區塊復原即可。
// import GeneratePlaylistButton from './generate-playlist-button';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { shows } = await getArchive();
  const show = shows.find((s) => s.slug === params.slug);

  if (!show) return { title: '找不到場次｜普通隊長' };

  const title = `${show.title}｜普通隊長`;
  const base = `${formatShowDate(show.date)}${show.venue ? ` @ ${show.venue}` : ''} 普通隊長演出歌單`;
  // 歌單已公開時，把歌名放進描述：搜尋結果與 AI 摘要才有東西可以直接引用
  const setlistText = show.songs.length > 0 ? `，共 ${show.songs.length} 首：${show.songs.map((s) => s.title).join('、')}` : '';
  const description = (base + setlistText).slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/show/${show.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'zh_TW',
      images: show.coverImageUrl ? [show.coverImageUrl] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: show.coverImageUrl ? [show.coverImageUrl] : undefined
    }
  };
}

export default async function ShowPage({ params }: { params: { slug: string } }) {
  const supabase = createPublicClient();

  const { data: show } = await supabase
    .from('shows')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single<Show>();

  if (!show) notFound();

  const [{ data: items }, { data: prevShow }, { data: nextShow }, attendanceCount, commentsResult] = await Promise.all([
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
      .maybeSingle<Pick<Show, 'slug' | 'title'>>(),
    createAdminClient()
      .from('show_attendances')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', show.id)
      .then(({ count }) => count ?? 0),
    supabase
      .from('show_comments')
      .select('id, nickname, body, created_at', { count: 'exact' })
      .eq('show_id', show.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<CommentItem[]>()
  ]);

  // 留言資料表還沒建立（沒執行 0002_show_comments.sql）時 error 不是 null，這時整個留言區都不顯示
  const commentsEnabled = !commentsResult.error;
  const comments = commentsResult.data ?? [];
  const commentTotal = commentsResult.count ?? comments.length;

  const setlist = items ?? [];
  const totalSeconds = sumDuration(setlist.map((i) => i.song?.duration_seconds ?? null));

  // 歌單有沒有公開：沒設定公開時間就直接顯示；有設定的話，要等時間到了才顯示
  const isRevealed = !show.setlist_reveal_at || new Date(show.setlist_reveal_at) <= new Date();

  const siteUrl = getSiteUrl();
  const showUrl = `${siteUrl}/show/${show.slug}`;
  const city = getCity(show.venue);
  const playedSongs = setlist.filter((i) => !i.is_placeholder && i.song);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    '@id': showUrl,
    name: show.title,
    description: `${formatShowDate(show.show_date)}${show.venue ? ` @ ${show.venue}` : ''} 普通隊長演出`,
    startDate: show.show_date,
    url: showUrl,
    inLanguage: 'zh-Hant-TW',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(show.venue
      ? {
          location: {
            '@type': 'Place',
            name: show.venue,
            address: {
              '@type': 'PostalAddress',
              ...(city ? { addressLocality: city } : {}),
              addressCountry: 'TW'
            }
          }
        }
      : {}),
    ...(show.cover_image_url ? { image: [show.cover_image_url] } : {}),
    performer: { '@id': `${siteUrl}/#band` },
    organizer: { '@id': `${siteUrl}/#band` },
    // 歌單：每首歌都連到歌曲專屬頁，AI 與搜尋引擎能把「這場演出」和「這首歌」串起來
    ...(isRevealed && playedSongs.length > 0
      ? {
          workPerformed: playedSongs.map((i) => ({
            '@type': 'MusicComposition',
            name: i.song!.title,
            url: `${siteUrl}/song/${i.song!.id}`
          }))
        }
      : {})
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: '首頁', path: '/' },
    { name: '全部場次', path: '/shows' },
    { name: show.title, path: `/show/${show.slug}` }
  ]);

  return (
    <main className="min-h-screen bg-noise bg-halftone">
      <JsonLd data={[jsonLd, breadcrumb]} />

      {show.cover_image_url && (
        <div className="relative h-[38vh] w-full sm:h-[50vh]">
          <Image
            src={show.cover_image_url}
            alt={`${show.title} 演出照片`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stage-950 via-stage-950/20 to-transparent" />
          
        </div>
      )}

      <div className="px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <BackLink />

          <div className="mt-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="tag-slash">{formatShowDate(show.show_date)}</p>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-paper sm:text-5xl">
                {show.title}
              </h1>
              {show.venue && (
                <p className="mt-3 flex items-center gap-2 text-stone-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0 text-signal">
                    <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z" />
                  </svg>
                  {show.venue}
                </p>
              )}
            </div>
            <CaptainBadge size={64} rotate={0} className="hidden shrink-0 sm:block" />
          </div>

          {isRevealed && (
            <dl className="mt-6 flex gap-10 border-y-2 border-paper py-4 font-accent">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Songs</dt>
                <dd className="text-2xl font-bold leading-none text-paper">{setlist.length}</dd>
              </div>
              {totalSeconds > 0 && (
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Duration</dt>
                  <dd className="text-2xl font-bold leading-none text-paper">{formatDuration(totalSeconds)}</dd>
                </div>
              )}
            </dl>
          )}

          {commentsEnabled && commentTotal > 0 && (
            <a href="#comments" className="mt-4 inline-block text-sm text-stone-400 transition hover:text-marquee">
              {commentTotal} 則現場留言 ↓
            </a>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {show.show_date <= todayTaipei() && <AttendButton showId={show.id} initialCount={attendanceCount} />}
            <ShareButton title={show.title} />
            <AddToCalendarButton title={show.title} dateStr={show.show_date} venue={show.venue} url={showUrl} />
            <ShareCardButton slug={show.slug} title={show.title} />
          </div>

          <div className="mt-10">
            <h2 className="section-title mb-4 text-2xl">歌單</h2>
            {isRevealed ? (
              setlist.length > 0 ? (
                <Setlist items={setlist} />
              ) : (
                <p className="text-center text-stone-500">歌單準備中，敬請期待。</p>
              )
            ) : (
              <div className="rounded-sm border border-dashed border-marquee/40 bg-stage-900 p-10 text-center">
                <span className="tag-solid">Coming Soon</span>
                <p className="mt-4 text-xl font-black text-paper">歌單敬請期待</p>
                <p className="mt-2 text-sm text-stone-500">
                  這場的歌單將於{' '}
                  {formatDateTimeTW(show.setlist_reveal_at as string)}{' '}
                  公開，先加入行事曆別錯過吧。
                </p>
              </div>
            )}
          </div>

          {commentsEnabled && (
            <ShowComments
              showId={show.id}
              initialComments={comments}
              total={commentTotal}
              canComment={show.show_date <= todayTaipei()}
            />
          )}

          {(prevShow || nextShow) && (
            <div className="mt-14 flex items-center justify-between gap-6 border-t border-stage-700 pt-6 text-sm">
              {prevShow ? (
                <a href={`/show/${prevShow.slug}`} className="min-w-0 text-stone-400 hover:text-marquee">
                  <span className="block font-accent text-xs uppercase tracking-[0.2em] text-signal">◀ Prev</span>
                  <span className="block truncate">{prevShow.title}</span>
                </a>
              ) : (
                <span />
              )}
              {nextShow ? (
                <a href={`/show/${nextShow.slug}`} className="min-w-0 text-right text-stone-400 hover:text-marquee">
                  <span className="block font-accent text-xs uppercase tracking-[0.2em] text-signal">Next ▶</span>
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
