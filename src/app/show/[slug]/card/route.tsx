import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { formatShowDate } from '@/lib/format';
import type { Show, SetlistItemWithSong } from '@/types/database';

export const revalidate = 0;

const WIDTH = 1080;
const HEIGHT = 1920;
const MAX_SONGS = 14;

/**
 * next/og（Satori）預設字型不含中文字，直接畫中文會變成空白方塊。
 * 這裡跟 Google Fonts 要「只含這張卡片實際會用到的字」的字型檔（用 text 參數做子集化，檔案才不會太大），
 * 並且刻意用一個舊版瀏覽器的 User-Agent 去要，Google 才會回傳 Satori 看得懂的 TTF/OTF 格式
 * （用一般瀏覽器的 UA 會拿到 woff2，Satori 沒辦法解析）。
 */
async function loadFont(text: string, weight: number): Promise<ArrayBuffer> {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}&text=${encodeURIComponent(text)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko)'
        }
      }
    )
  ).text();

  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error('無法取得字型檔');

  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: show } = await supabase
    .from('shows')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single<Show>();

  if (!show) {
    return new Response('Not found', { status: 404 });
  }

  const { data: items } = await supabase
    .from('setlist_items')
    .select('*, song:songs(*)')
    .eq('show_id', show.id)
    .order('position', { ascending: true })
    .returns<SetlistItemWithSong[]>();

  // 跟頁面上一樣的規則：歌單公開時間還沒到的話，卡片也不能提前曝光曲目
  const isRevealed = !show.setlist_reveal_at || new Date(show.setlist_reveal_at) <= new Date();
  const setlist = isRevealed ? items ?? [] : [];
  const displaySongs = setlist.slice(0, MAX_SONGS);
  const remaining = setlist.length - displaySongs.length;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000';

  const allText = [
    '普通隊長',
    'SETLIST',
    show.title,
    formatShowDate(show.show_date),
    show.venue ?? '',
    '歌單敬請期待',
    '點擊連結聽完整播放',
    siteUrl.replace(/^https?:\/\//, ''),
    ...displaySongs.map((i) => (i.is_placeholder ? '敬請期待' : i.song?.title ?? '')),
    remaining > 0 ? `等共 ${setlist.length} 首` : ''
  ].join('');

  const [fontRegular, fontBold] = await Promise.all([loadFont(allText, 400), loadFont(allText, 900)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#170f0a',
          padding: '80px 72px',
          fontFamily: 'Noto Sans TC'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${siteUrl}/brand/mascot-head.png`} width={88} height={88} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#c9a876', fontSize: 26, letterSpacing: 6 }}>SETLIST</span>
            <span style={{ color: '#f2ece0', fontSize: 40, fontWeight: 900 }}>普通隊長</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 64 }}>
          <span style={{ color: '#c9a876', fontSize: 28 }}>{formatShowDate(show.show_date)}</span>
          <span style={{ color: '#f2ece0', fontSize: 56, fontWeight: 900, marginTop: 12, lineHeight: 1.25 }}>
            {show.title}
          </span>
          {show.venue && <span style={{ color: '#a8a29e', fontSize: 30, marginTop: 12 }}>{show.venue}</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56, flex: 1, gap: 18 }}>
          {displaySongs.length === 0 ? (
            <span style={{ color: '#78716c', fontSize: 32 }}>歌單敬請期待</span>
          ) : (
            displaySongs.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ color: '#78716c', fontSize: 28, width: 48 }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span style={{ color: item.is_placeholder ? '#78716c' : '#f2ece0', fontSize: 32 }}>
                  {item.is_placeholder ? '敬請期待' : item.song?.title}
                </span>
              </div>
            ))
          )}
          {remaining > 0 && (
            <span style={{ color: '#78716c', fontSize: 28, marginTop: 8 }}>⋯ 等共 {setlist.length} 首</span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderTop: '2px solid #40291a',
            paddingTop: 40
          }}
        >
          <span style={{ color: '#e2231c', fontSize: 30, fontWeight: 900 }}>點擊連結聽完整播放</span>
          <span style={{ color: '#78716c', fontSize: 24, marginTop: 8 }}>
            {siteUrl.replace(/^https?:\/\//, '')}/show/{show.slug}
          </span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Noto Sans TC', data: fontRegular, weight: 400, style: 'normal' },
        { name: 'Noto Sans TC', data: fontBold, weight: 900, style: 'normal' }
      ]
    }
  );
}
