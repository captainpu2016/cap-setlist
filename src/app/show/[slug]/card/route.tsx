import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { formatShowDate } from '@/lib/format';
import type { Show, SetlistItemWithSong } from '@/types/database';

export const revalidate = 0;

const WIDTH = 1080;
const HEIGHT = 1920;
// 極端情況（超長歌單）還是要有一個保底上限，避免字小到完全看不清楚；
// 一般龐克演出歌單很少會超過這個數字，實務上幾乎不會被截斷
const HARD_CAP = 40;

/** 依歌曲數量算出合適的字級／行距，數量越多字越小、行距越緊，讓整份歌單都能塞進同一張圖 */
function getSongRowMetrics(count: number) {
  if (count <= 12) return { fontSize: 32, numberSize: 26, padding: '14px 20px' };
  if (count <= 18) return { fontSize: 27, numberSize: 22, padding: '10px 20px' };
  if (count <= 24) return { fontSize: 23, numberSize: 19, padding: '7px 20px' };
  if (count <= 32) return { fontSize: 19, numberSize: 16, padding: '5px 20px' };
  return { fontSize: 16, numberSize: 14, padding: '3px 20px' };
}

// 跟網站 Logo／favicon 同一份星芒座標，維持品牌一致
const STARBURST_POINTS =
  '50,4 57,14.7 67.6,7.5 70,20.1 82.5,17.5 79.9,30 92.5,32.4 85.3,43 96,50 85.3,57 92.5,67.6 79.9,70 82.5,82.5 70,79.9 67.6,92.5 57,85.3 50,96 43,85.3 32.4,92.5 30,79.9 17.5,82.5 20.1,70 7.5,67.6 14.7,57 4,50 14.7,43 7.5,32.4 20.1,30 17.5,17.5 30,20.1 32.4,7.5 43,14.7';

/**
 * 跟 Google Fonts 要「只含這張卡片實際會用到的字」的字型檔（用 text 參數做子集化，
 * 檔案才不會太大）。不特別假裝舊瀏覽器 UA，直接吃 Google 回傳的格式（現在的 Satori
 * 版本可以處理 woff2），regex 也放寬，避免格式稍有出入就整個抓空。
 */
async function loadFont(text: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}&text=${encodeURIComponent(text)}`
      )
    ).text();

    const match = css.match(/src:\s*url\(([^)]+)\)/);
    if (!match) return null;

    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[card] 字型載入失敗', err);
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
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

    const isRevealed = !show.setlist_reveal_at || new Date(show.setlist_reveal_at) <= new Date();
    const setlist = isRevealed ? items ?? [] : [];
    const displaySongs = setlist.slice(0, HARD_CAP);
    const remaining = setlist.length - displaySongs.length;
    const metrics = getSongRowMetrics(setlist.length);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000';
    const domainText = siteUrl.replace(/^https?:\/\//, '');

    const allText = [
      '普通隊長',
      'SETLIST',
      show.title,
      formatShowDate(show.show_date),
      show.venue ?? '',
      '歌單敬請期待',
      '點擊連結聽完整播放',
      domainText,
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
            backgroundImage: 'radial-gradient(circle, rgba(201,168,118,0.5) 3px, transparent 3.6px)',
            backgroundSize: '36px 36px',
            fontFamily: fontRegular ? 'Noto Sans TC' : undefined
          }}
        >
          {/* 外框留白 + 細金框，營造海報邊框感 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              margin: 28,
              border: '2px solid rgba(201,168,118,0.55)',
              borderRadius: 12,
              padding: '64px 64px 56px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ display: 'flex', transform: 'rotate(-8deg)' }}>
                <svg width="104" height="104" viewBox="0 0 100 100">
                  <polygon points={STARBURST_POINTS} fill="#e2231c" stroke="#c9a876" strokeWidth="2" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#c9a876', fontSize: 26, letterSpacing: 6 }}>SETLIST</span>
                <span style={{ color: '#f2ece0', fontSize: 42, fontWeight: 900 }}>普通隊長</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 60 }}>
              <span style={{ color: '#c9a876', fontSize: 28 }}>{formatShowDate(show.show_date)}</span>
              <span style={{ color: '#f2ece0', fontSize: 54, fontWeight: 900, marginTop: 12, lineHeight: 1.25 }}>
                {show.title}
              </span>
              {show.venue && <span style={{ color: '#a8a29e', fontSize: 30, marginTop: 12 }}>{show.venue}</span>}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: 48,
                flex: 1,
                borderRadius: 10,
                overflow: 'hidden'
              }}
            >
              {displaySongs.length === 0 ? (
                <span style={{ color: '#78716c', fontSize: 32, padding: '24px 4px' }}>歌單敬請期待</span>
              ) : (
                displaySongs.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      padding: metrics.padding,
                      backgroundColor: idx % 2 === 0 ? 'rgba(201,168,118,0.08)' : 'transparent'
                    }}
                  >
                    <span style={{ color: '#c9a876', fontSize: metrics.numberSize, width: 44 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={{ color: item.is_placeholder ? '#78716c' : '#f2ece0', fontSize: metrics.fontSize }}>
                      {item.is_placeholder ? '敬請期待' : item.song?.title}
                    </span>
                  </div>
                ))
              )}
              {remaining > 0 && (
                <span style={{ color: '#78716c', fontSize: 26, padding: '10px 20px' }}>
                  ⋯ 等共 {setlist.length} 首（歌單過長，圖卡放不下，完整版請點連結）
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#e2231c',
                  borderRadius: 999,
                  padding: '18px 40px'
                }}
              >
                <span style={{ color: '#f2ece0', fontSize: 30, fontWeight: 900 }}>點擊連結聽完整播放</span>
              </div>
              <span style={{ color: '#78716c', fontSize: 24, marginTop: 18 }}>
                {domainText}/show/{show.slug}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts: fontRegular
          ? [
              { name: 'Noto Sans TC', data: fontRegular, weight: 400, style: 'normal' } as const,
              ...(fontBold ? [{ name: 'Noto Sans TC', data: fontBold, weight: 900, style: 'normal' } as const] : [])
            ]
          : []
      }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[card] 產生圖片失敗', err);
    return new Response(`產生圖片失敗：${err instanceof Error ? err.message : 'unknown error'}`, {
      status: 500
    });
  }
}
