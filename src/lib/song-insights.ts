import { isIntroSong, type ArchiveShow } from '@/lib/archive';

/** 睽違多少場沒唱，才算「久違」 */
export const RETURN_GAP = 15;
/** 共唱過幾場以內算「稀有」（翻唱不套用，因為翻唱本來就都唱得少） */
export const RARE_MAX_PLAYS = 2;

export type SongLabel = { kind: 'first' | 'return' | 'rare'; text: string };

/** 由舊到新、且歌單已公開的場次；所有履歷計算都以這個順序為準 */
function chronological(shows: ArchiveShow[]): ArchiveShow[] {
  return shows.filter((s) => s.songs.length > 0).reverse();
}

/**
 * 算出某一場裡每首歌的「看點」標籤：首次登場／睽違 N 場／稀有。
 * 每首歌最多一個標籤，優先順序：首次登場 > 久違 > 稀有。
 */
export function getShowLabels(shows: ArchiveShow[], showSlug: string): Record<string, SongLabel> {
  const chrono = chronological(shows);
  const k = chrono.findIndex((s) => s.slug === showSlug);
  if (k < 0) return {};

  const indices = new Map<string, number[]>();
  chrono.forEach((s, idx) => {
    for (const song of s.songs) {
      if (isIntroSong(song.title)) continue;
      const list = indices.get(song.id) ?? [];
      if (list[list.length - 1] !== idx) list.push(idx);
      indices.set(song.id, list);
    }
  });

  const labels: Record<string, SongLabel> = {};
  for (const song of chrono[k].songs) {
    if (isIntroSong(song.title) || labels[song.id]) continue;
    const list = indices.get(song.id) ?? [];
    const prior = list.filter((i) => i < k);

    if (prior.length === 0) {
      labels[song.id] = { kind: 'first', text: '首次登場' };
    } else {
      const gap = k - prior[prior.length - 1] - 1;
      if (gap >= RETURN_GAP) {
        labels[song.id] = { kind: 'return', text: `睽違 ${gap} 場` };
      } else if (!song.isCover && list.length <= RARE_MAX_PLAYS) {
        labels[song.id] = { kind: 'rare', text: `稀有・共 ${list.length} 場` };
      }
    }
  }
  return labels;
}

export type SongProfile = {
  plays: number;
  /** 首次與最近一次（由舊到新排序後的第一個與最後一個） */
  first: { slug: string; title: string; date: string; venue: string | null };
  last: { slug: string; title: string; date: string; venue: string | null };
  /** 每次演出的細節（新到舊）：排在第幾首／全場幾首 */
  appearances: { slug: string; title: string; date: string; venue: string | null; position: number; total: number }[];
  byYear: { year: string; plays: number; shows: number }[];
  openerCount: number;
  closerCount: number;
  /** 平均排在歌單的哪一段 */
  placement: '前段' | '中段' | '後段';
  /** 首次演出之後的場次裡，這首歌出現的比例（0~1）與分母 */
  rate: number;
  showsSinceFirst: number;
  /** 最常接在它後面／前面的歌 */
  nextSongs: { id: string; title: string; count: number }[];
  prevSongs: { id: string; title: string; count: number }[];
  /** 距離上次演出已經過幾場 */
  showsSinceLast: number;
};

function topCounts(map: Map<string, { id: string; title: string; count: number }>, limit: number) {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh-Hant'))
    .slice(0, limit);
}

/** 單一歌曲的履歷；沒有任何已公開的演出就回傳 null */
export function getSongProfile(shows: ArchiveShow[], songId: string): SongProfile | null {
  const chrono = chronological(shows);
  const appearances: SongProfile['appearances'] = [];
  const next = new Map<string, { id: string; title: string; count: number }>();
  const prev = new Map<string, { id: string; title: string; count: number }>();
  let opener = 0;
  let closer = 0;
  let placementSum = 0;
  let firstIdx = -1;
  let lastIdx = -1;

  chrono.forEach((show, idx) => {
    // 歌單裡不算開場音樂（INTRO），所以「第幾首」也不把它算進去
    const songs = show.songs.filter((s) => !isIntroSong(s.title));
    const pos = songs.findIndex((s) => s.id === songId);
    if (pos < 0) return;
    if (firstIdx < 0) firstIdx = idx;
    lastIdx = idx;
    appearances.push({ slug: show.slug, title: show.title, date: show.date, venue: show.venue, position: pos + 1, total: songs.length });
    if (pos === 0) opener += 1;
    if (pos === songs.length - 1) closer += 1;
    placementSum += songs.length > 1 ? pos / (songs.length - 1) : 0.5;

    const after = songs[pos + 1];
    if (after) {
      const e = next.get(after.id) ?? { id: after.id, title: after.title, count: 0 };
      e.count += 1;
      next.set(after.id, e);
    }
    const before = songs[pos - 1];
    if (before) {
      const e = prev.get(before.id) ?? { id: before.id, title: before.title, count: 0 };
      e.count += 1;
      prev.set(before.id, e);
    }
  });

  if (appearances.length === 0) return null;

  const plays = appearances.length;
  const firstShow = chrono[firstIdx];
  const lastShow = chrono[lastIdx];
  const avg = placementSum / plays;

  const years = new Map<string, { plays: number; shows: number }>();
  chrono.forEach((show, idx) => {
    if (idx < firstIdx) return;
    const y = show.date.slice(0, 4);
    const e = years.get(y) ?? { plays: 0, shows: 0 };
    e.shows += 1;
    if (appearances.some((a) => a.slug === show.slug)) e.plays += 1;
    years.set(y, e);
  });

  const showsSinceFirst = chrono.length - firstIdx;

  return {
    plays,
    first: { slug: firstShow.slug, title: firstShow.title, date: firstShow.date, venue: firstShow.venue },
    last: { slug: lastShow.slug, title: lastShow.title, date: lastShow.date, venue: lastShow.venue },
    appearances: appearances.reverse(),
    byYear: Array.from(years.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, v]) => ({ year, ...v })),
    openerCount: opener,
    closerCount: closer,
    placement: avg < 0.34 ? '前段' : avg < 0.67 ? '中段' : '後段',
    rate: plays / showsSinceFirst,
    showsSinceFirst,
    nextSongs: topCounts(next, 3),
    prevSongs: topCounts(prev, 3),
    showsSinceLast: chrono.length - 1 - lastIdx
  };
}
