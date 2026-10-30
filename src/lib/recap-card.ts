export interface RecapData {
  shows: number;
  distinctSongs: number;
  totalPlays: number;
  cities: number;
  topSongs: { title: string; count: number }[];
  first: { title: string; date: string } | null;
  latest: { title: string; date: string } | null;
  domain: string;
}

const W = 1080;
const H = 1920;
const BG = '#0b0908';
const PAPER = '#f4efe6';
const GOLD = '#d4b27a';
const RED = '#e2231c';
const LINE = '#302a27';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 文字太長時截斷並補上刪節號 */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/**
 * 在瀏覽器裡用 Canvas 畫出個人回顧卡（1080×1920）。
 * 全部在使用者自己的裝置上完成，參與紀錄不會被傳到任何地方。
 */
export async function drawRecapCard(canvas: HTMLCanvasElement, data: RecapData): Promise<void> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');

  const family = getComputedStyle(document.body).fontFamily;
  const sample = `${data.topSongs.map((s) => s.title).join('')}${data.first?.title ?? ''}${data.latest?.title ?? ''}我的現場紀錄場演出首不同的歌座城市最常聽到的歌第一場最近一場`;
  try {
    await Promise.all([document.fonts.load(`900 40px ${family}`, sample), document.fonts.load(`400 40px ${family}`, sample)]);
  } catch {
    // 字型載入失敗就用系統字型，卡片照常產生
  }

  const [logo, mascot] = await Promise.all([loadImage('/brand/logo-horizontal-white.png'), loadImage('/brand/mascot-head.png')]);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // 頂部：Logo + 眉標
  if (logo) ctx.drawImage(logo, 44, 40, 171, 96);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GOLD;
  ctx.font = `900 28px ${family}`;
  ctx.textAlign = 'right';
  ctx.fillText('MY SHOW RECAP', W - 64, 100);
  ctx.textAlign = 'left';

  // 紅色粗線
  ctx.fillStyle = RED;
  ctx.fillRect(0, 170, W, 10);

  // 主數字
  ctx.fillStyle = GOLD;
  ctx.font = `900 40px ${family}`;
  ctx.fillText('我的現場紀錄', 64, 270);

  ctx.fillStyle = PAPER;
  ctx.font = `900 330px ${family}`;
  ctx.fillText(String(data.shows), 56, 590);
  const numW = ctx.measureText(String(data.shows)).width;
  ctx.font = `900 64px ${family}`;
  ctx.fillText('場演出', 56 + numW + 24, 590);

  // 三個小統計
  const stats: [string, string][] = [
    [String(data.distinctSongs), '首不同的歌'],
    [String(data.totalPlays), '首次現場聽到'],
    [String(data.cities), '座城市']
  ];
  const colW = (W - 128) / 3;
  stats.forEach(([n, label], i) => {
    const x = 64 + i * colW;
    ctx.fillStyle = RED;
    ctx.fillRect(x, 660, 56, 6);
    ctx.fillStyle = PAPER;
    ctx.font = `900 84px ${family}`;
    ctx.fillText(n, x, 760);
    ctx.fillStyle = '#a8a29e';
    ctx.font = `400 28px ${family}`;
    ctx.fillText(label, x, 806);
  });

  // 最常聽到的歌
  ctx.fillStyle = PAPER;
  ctx.fillRect(64, 890, W - 128, 3);
  ctx.font = `900 36px ${family}`;
  ctx.fillText('最常聽到的歌', 64, 950);

  const top = data.topSongs.slice(0, 5);
  const maxCount = Math.max(1, ...top.map((s) => s.count));
  top.forEach((s, i) => {
    const y = 1010 + i * 92;
    ctx.fillStyle = RED;
    ctx.font = `900 30px ${family}`;
    ctx.fillText(String(i + 1).padStart(2, '0'), 64, y + 30);
    ctx.fillStyle = PAPER;
    ctx.font = `900 38px ${family}`;
    ctx.fillText(fit(ctx, s.title, 600), 140, y + 30);
    ctx.fillStyle = '#a8a29e';
    ctx.font = `400 28px ${family}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${s.count} 次`, W - 64, y + 30);
    ctx.textAlign = 'left';
    ctx.fillStyle = LINE;
    ctx.fillRect(140, y + 46, W - 204, 8);
    ctx.fillStyle = RED;
    ctx.fillRect(140, y + 46, ((W - 204) * s.count) / maxCount, 8);
  });

  // 第一場 / 最近一場
  const boxY = 1500;
  const boxes: [string, { title: string; date: string } | null][] = [
    ['第一場', data.first],
    ['最近一場', data.latest]
  ];
  boxes.forEach(([label, v], i) => {
    if (!v) return;
    const x = 64 + i * ((W - 128) / 2 + 0);
    const bw = (W - 128) / 2 - 16;
    ctx.fillStyle = '#141110';
    ctx.fillRect(x, boxY, bw, 180);
    ctx.fillStyle = RED;
    ctx.fillRect(x, boxY, 6, 180);
    ctx.fillStyle = GOLD;
    ctx.font = `900 26px ${family}`;
    ctx.fillText(label, x + 28, boxY + 48);
    ctx.fillStyle = PAPER;
    ctx.font = `900 30px ${family}`;
    ctx.fillText(fit(ctx, v.title, bw - 56), x + 28, boxY + 100);
    ctx.fillStyle = '#a8a29e';
    ctx.font = `400 26px ${family}`;
    ctx.fillText(v.date.replace(/-/g, '.'), x + 28, boxY + 146);
  });

  // 頁尾
  ctx.fillStyle = LINE;
  ctx.fillRect(0, 1730, W, 2);
  if (mascot) ctx.drawImage(mascot, W - 64 - 130, 1750, 130, 130);
  ctx.fillStyle = PAPER;
  ctx.font = `900 34px ${family}`;
  ctx.fillText('你也來留下你的現場紀錄', 64, 1810);
  ctx.fillStyle = GOLD;
  ctx.font = `400 26px ${family}`;
  ctx.fillText(data.domain, 64, 1856);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** 優先用系統分享（手機），不行就下載 */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
