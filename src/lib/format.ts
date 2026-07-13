/** 秒數轉 mm:ss，null 時回傳 undefined 讓呼叫端決定要不要顯示 */
export function formatDuration(seconds: number | null | undefined): string | undefined {
  if (seconds == null || Number.isNaN(seconds)) return undefined;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 整份歌單總長度（秒），忽略沒有時長資料的曲目 */
export function sumDuration(seconds: (number | null)[]): number {
  return seconds.reduce((total: number, s) => total + (s ?? 0), 0);
}

export function formatShowDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

/** 從場地欄位解析出城市，依慣例是空白鍵前的第一個詞，例如「高雄 LIVE WAREHOUSE 小庫」→「高雄」 */
export function getCity(venue: string | null): string | null {
  if (!venue) return null;
  const trimmed = venue.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

/** 卡片用的精簡日期格式，例如 2026/6/19（五），資料跨多年時不會混淆 */
export function formatShowDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString('zh-TW', { weekday: 'short' }).replace('週', '');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${weekday}）`;
}

/** 從 Spotify 網址（open.spotify.com/track/{id}）解析出純 track ID */
export function parseSpotifyTrackId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  // 允許使用者直接貼純 ID
  if (/^[a-zA-Z0-9]{15,25}$/.test(trimmed) && !trimmed.includes('/')) return trimmed;
  const match = trimmed.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * 把 Dropbox 分享連結轉成可以直接串流播放的網址。
 * 不是用 ?dl=1（那個參數會強制觸發瀏覽器的下載提示，<audio> 標籤讀不到），
 * 而是換成 dl.dropboxusercontent.com 這個 Dropbox 官方提供、專門給網頁內嵌/
 * 直接引用用的網域，會直接回傳檔案內容本身，才能被 <audio src="..."> 正常播放。
 */
export function toDropboxDirectUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('dropbox.com')) {
      u.hostname = 'dl.dropboxusercontent.com';
      u.searchParams.delete('dl');
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** slug 化：中文保留、空白轉 -、移除特殊符號，供場次網址使用 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
