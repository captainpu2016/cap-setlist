/** 歌名相關的小工具（純函式，伺服器與瀏覽器端都能用） */

/** 翻唱歌：專輯標記為翻唱專輯，或歌名以「(Cover)」開頭（後台沒歸到翻唱專輯時的備援） */
export function isCoverSong(title: string, albumIsCover: boolean | null | undefined): boolean {
  return albumIsCover === true || /^\s*[(（]cover[)）]/i.test(title);
}

/** 開場音樂（歌名以「INTRO」開頭，例如「INTRO: Endless Trip」）：不算歌曲，統計時排除 */
export function isIntroSong(title: string): boolean {
  return /^\s*intro\b/i.test(title);
}

/** 顯示用歌名：去掉開頭的「(Cover) 」標記 */
export function displaySongTitle(title: string): string {
  return title.replace(/^\s*[(（]cover[)）]\s*/i, '');
}

/** 翻唱歌的歌名慣例是「(Cover) 歌名 (原唱)」：拆出歌名與原唱，沒有括號時原唱為 null */
export function parseCoverTitle(title: string): { name: string; artist: string | null } {
  const shown = displaySongTitle(title);
  const m = shown.match(/^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/);
  return m && m[1] ? { name: m[1], artist: m[2].trim() } : { name: shown, artist: null };
}
