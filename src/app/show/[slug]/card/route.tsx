import { ImageResponse } from 'next/og';
import qrcode from 'qrcode-generator';
import { createPublicClient } from '@/lib/supabase/public';
import { formatShowDate } from '@/lib/format';
import { starsPolygons } from '@/lib/stars';
import type { Show, SetlistItemWithSong } from '@/types/database';

const WIDTH = 1080;
const HEIGHT = 1920;

// 歌單再長也要有保底上限，避免字小到看不清楚；兩欄排版下 48 首大約是極限
const HARD_CAP = 48;

const BG = '#0b0908';
const PAPER = '#f4efe6';
const GOLD = '#d4b27a';
const RED = '#e2231c';
const LINE = '#302a27';

const FOOTER_H = 230;

/** 快取：同一個伺服器實例內，字型與品牌圖不用每次重抓 */
const fontCache = new Map<string, ArrayBuffer>();
const imageCache = new Map<string, string>();

function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}-${h}`;
}

/**
 * 跟 Google Fonts 要「只含卡片實際用到的字」的字型子集（用 text 參數），檔案才不會太大。
 * 結果依「字重＋文字內容」快取，重複產生同一場卡片時不用再連線。
 */
async function loadFont(text: string, weight: number): Promise<ArrayBuffer | null> {
  const key = `${weight}:${hash(text)}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}&text=${encodeURIComponent(text)}`, {
        next: { revalidate: 86400 }
      })
    ).text();
    const match = css.match(/src:\s*url\(([^)]+)\)/);
    if (!match) return null;
    const res = await fetch(match[1], { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    fontCache.set(key, data);
    return data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[card] 字型載入失敗', err);
    return null;
  }
}

/**
 * 把圖片抓下來轉成 data URI 直接嵌進卡片：只抓一次、有逾時與大小上限，
 * 抓不到（或格式 Satori 不支援）就回傳 null，由呼叫端退回沒有圖的版面。
 */
async function toDataUri(url: string | null, opts: { maxBytes: number; timeoutMs: number; cache?: boolean }) {
  if (!url) return null;
  if (opts.cache && imageCache.has(url)) return imageCache.get(url)!;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(opts.timeoutMs) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type')?.split(';')[0] ?? '';
    if (!/^image\/(png|jpeg)$/.test(type)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > opts.maxBytes) return null;
    const uri = `data:${type};base64,${Buffer.from(buf).toString('base64')}`;
    if (opts.cache) imageCache.set(url, uri);
    return uri;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[card] 圖片抓取失敗', url, err);
    return null;
  }
}

/** 把網址做成 QR code 的 SVG 路徑（每個深色格子一小段） */
function qrPath(text: string): { d: string; size: number } {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    }
  }
  return { d, size: n };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const supabase = createPublicClient();
    const origin = new URL(request.url).origin;

    const { data: show } = await supabase
      .from('shows')
      .select('*')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single<Show>();

    if (!show) return new Response('Not found', { status: 404 });

    const [{ data: items }, logo, mascot, cover] = await Promise.all([
      supabase
        .from('setlist_items')
        .select('*, song:songs(*)')
        .eq('show_id', show.id)
        .order('position', { ascending: true })
        .returns<SetlistItemWithSong[]>(),
      toDataUri(`${origin}/brand/logo-horizontal-white.png`, { maxBytes: 400_000, timeoutMs: 4000, cache: true }),
      toDataUri(`${origin}/brand/mascot-head.png`, { maxBytes: 400_000, timeoutMs: 4000, cache: true }),
      toDataUri(show.cover_image_url, { maxBytes: 3_000_000, timeoutMs: 5000 })
    ]);

    const isRevealed = !show.setlist_reveal_at || new Date(show.setlist_reveal_at) <= new Date();
    const setlist = isRevealed ? items ?? [] : [];
    const songs = setlist.slice(0, HARD_CAP);
    const remaining = setlist.length - songs.length;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
    const showUrl = `${siteUrl}/show/${show.slug}`;
    const domainText = showUrl.replace(/^https?:\/\//, '');
    const qr = qrPath(showUrl);

    const titles = songs.map((i) => (i.is_placeholder ? '敬請期待' : i.song?.title ?? ''));
    const allText = [
      show.title,
      formatShowDate(show.show_date),
      show.venue ?? '',
      '歌單敬請期待',
      '掃描 QR code，看完整歌單',
      'SETLIST',
      `0123456789 ${setlist.length} 首歌 · ⋯… 等共首，完整版請看網站`,
      domainText,
      ...titles
    ].join('');

    const [fontRegular, fontBold] = await Promise.all([loadFont(allText, 400), loadFont(allText, 900)]);

    // ── 版面計算：照片區高度、一欄或兩欄、依剩餘高度決定行高與字級 ──
    const heroH = cover ? 640 : 440;
    const cols = songs.length <= 14 ? 1 : 2;
    const rowsPerCol = Math.max(1, Math.ceil(songs.length / cols));
    const listH = HEIGHT - heroH - 10 - FOOTER_H - 56 - 56 - (remaining > 0 ? 44 : 0);
    const rowH = clamp(Math.floor(listH / rowsPerCol), 36, 78);
    const fontSize = clamp(Math.round(rowH * 0.46), 20, 36);

    const columns: { item: (typeof songs)[number]; index: number }[][] = Array.from({ length: cols }, () => []);
    songs.forEach((item, index) => columns[Math.floor(index / rowsPerCol)].push({ item, index }));

    const stars = starsPolygons();
    const titleSize = show.title.length > 28 ? 56 : 68;

    const image = new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: BG,
            color: PAPER,
            fontFamily: fontRegular ? 'Noto Sans TC' : undefined
          }}
        >
          {/* 上半：演出照片 + 由下往上的暗色漸層，文字壓在照片上 */}
          <div style={{ display: 'flex', position: 'relative', width: WIDTH, height: heroH, backgroundColor: '#1d1917' }}>
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                width={WIDTH}
                height={heroH}
                style={{ position: 'absolute', top: 0, left: 0, width: WIDTH, height: heroH, objectFit: 'cover' }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: WIDTH,
                height: heroH,
                display: 'flex',
                backgroundImage: `linear-gradient(to top, ${BG} 4%, rgba(11,9,8,0.6) 45%, rgba(11,9,8,0.25) 100%)`
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: 52,
                left: 64,
                right: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} width={171} height={96} style={{ marginLeft: -20 }} />
              ) : (
                <span style={{ fontSize: 44, fontWeight: 900 }}>普通隊長</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <svg width={(34 * stars.width) / stars.height} height={34} viewBox={`0 0 ${stars.width} ${stars.height}`}>
                  {stars.polygons.map((points, i) => (
                    <polygon key={i} points={points} fill={RED} />
                  ))}
                </svg>
                <span style={{ fontSize: 28, fontWeight: 900, color: GOLD, letterSpacing: 8 }}>SETLIST</span>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 64,
                right: 64,
                bottom: 36,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <span style={{ fontSize: 30, fontWeight: 900, color: GOLD }}>{formatShowDate(show.show_date)}</span>
              <span style={{ fontSize: titleSize, fontWeight: 900, lineHeight: 1.2, marginTop: 10 }}>{show.title}</span>
              {show.venue && <span style={{ fontSize: 30, color: '#d6d3d1', marginTop: 12 }}>{show.venue}</span>}
            </div>
          </div>

          {/* 紅色粗線，跟網站首頁頁首底線一致 */}
          <div style={{ display: 'flex', width: WIDTH, height: 10, backgroundColor: RED }} />

          {/* 歌單：一欄或兩欄，行距依歌曲數量自動縮放 */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '40px 64px 16px' }}>
            {songs.length === 0 ? (
              <span style={{ fontSize: 40, fontWeight: 900, color: '#78716c', marginTop: 40 }}>歌單敬請期待</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    height: 56,
                    flexShrink: 0,
                    borderBottom: `3px solid ${PAPER}`
                  }}
                >
                  <span style={{ fontSize: 26, fontWeight: 900 }}>歌單</span>
                  <span style={{ fontSize: 24, color: GOLD }}>{setlist.length} 首歌</span>
                </div>
                <div style={{ display: 'flex', flex: 1, gap: 40 }}>
                  {columns.map((col, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      {col.map(({ item, index }) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            height: rowH,
                            gap: 16,
                            borderBottom: `1px solid ${LINE}`
                          }}
                        >
                          <span
                            style={{
                              width: Math.round(fontSize * 1.7),
                              fontSize: Math.round(fontSize * 0.85),
                              fontWeight: 900,
                              color: RED
                            }}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize,
                              fontWeight: 900,
                              color: item.is_placeholder ? '#78716c' : PAPER,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.is_placeholder ? '敬請期待' : item.song?.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {remaining > 0 && (
                  <span style={{ fontSize: 24, color: '#78716c', marginTop: 14 }}>
                    ⋯ 等共 {setlist.length} 首，完整版請看網站
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 頁尾：QR code、導引文字、吉祥物 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: FOOTER_H,
              padding: '0 64px',
              gap: 36,
              borderTop: `2px solid ${LINE}`
            }}
          >
            <div style={{ display: 'flex', padding: 14, backgroundColor: PAPER }}>
              <svg
                width={150}
                height={150}
                viewBox={`0 0 ${qr.size} ${qr.size}`}
                shapeRendering="crispEdges"
              >
                <path d={qr.d} fill={BG} />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 36, fontWeight: 900 }}>掃描 QR code，看完整歌單</span>
              <span style={{ fontSize: 24, color: GOLD, marginTop: 14 }}>{domainText}</span>
            </div>
            {mascot && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mascot} width={130} height={130} />
            )}
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
          : [],
        // 歌單改動不頻繁：瀏覽器快取 5 分鐘、CDN 快取 5 分鐘，過期後先給舊圖再背景更新
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400' }
      }
    );
    return image;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[card] 產生圖片失敗', err);
    return new Response(`產生圖片失敗：${err instanceof Error ? err.message : 'unknown error'}`, { status: 500 });
  }
}
