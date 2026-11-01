import { isIntroSong, parseCoverTitle, type ArchiveShow } from '@/lib/archive';
import { SHOW_CATEGORIES } from '@/lib/show-category';

export type RankedSong = { id: string; title: string; count: number };

export type ArchiveStats = {
  showsWithSetlist: number;
  totalSlots: number;
  avgLength: number;
  /** 歌曲與翻唱分開算：每場平均各幾首、不同的歌各幾首 */
  avgOriginal: number;
  avgCover: number;
  originalSongCount: number;
  coverSongCount: number;
  originalPlays: number;
  coverPlays: number;
  /** 曾經翻唱過的歌（不計次數），最近唱過的排前面 */
  coverSongs: { id: string; title: string; lastDate: string }[];
  topSongs: RankedSong[];
  byYear: { year: string; shows: number; avgLength: number; distinctSongs: number }[];
  oneTimers: { id: string; title: string; showTitle: string; date: string; slug: string }[];
  dormant: { id: string; title: string; lastDate: string; count: number; showsSince: number }[];
};

/**
 * 翻唱歌的原唱是不是海外樂團：歌名含假名一律算海外；其餘依下面這份名單比對（小寫、不分大小寫）。
 * 之後翻唱了新的海外樂團，把團名關鍵字補進來；沒列在這裡的就歸在「台灣樂團」。
 */
const FOREIGN_ARTIST = /hi-?standard|shank|\benth\b|honest|kuzira|mongol800|asian kung-fu generation|ellegarden|locofrank/i;
const HAS_KANA = /[\u3040-\u30ff]/;

export type CoverGroup = { artist: string; songs: { id: string; name: string; lastDate: string }[]; latest: string };

/** 翻唱歌依原唱樂團分組：海外樂團在前、台灣樂團在後；同一樂團的歌排在一起，團與團之間、團內的歌都是最近唱的在前 */
export function groupCoversByArtist(covers: ArchiveStats['coverSongs']): { foreign: CoverGroup[]; taiwan: CoverGroup[] } {
  const groups = new Map<string, CoverGroup>();
  for (const c of covers) {
    const { name, artist } = parseCoverTitle(c.title);
    const key = artist ?? '原唱未標示';
    const g = groups.get(key) ?? { artist: key, songs: [], latest: '' };
    g.songs.push({ id: c.id, name, lastDate: c.lastDate });
    if (c.lastDate > g.latest) g.latest = c.lastDate;
    groups.set(key, g);
  }
  const all = Array.from(groups.values());
  for (const g of all) g.songs.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name, 'zh-Hant'));
  const byLatest = (a: CoverGroup, b: CoverGroup) => b.latest.localeCompare(a.latest) || a.artist.localeCompare(b.artist, 'zh-Hant');
  const isForeign = (g: CoverGroup) => HAS_KANA.test(g.artist + g.songs.map((s) => s.name).join('')) || FOREIGN_ARTIST.test(g.artist);
  return { foreign: all.filter(isForeign).sort(byLatest), taiwan: all.filter((g) => !isForeign(g)).sort(byLatest) };
}

export type CategoryStat = { value: string; label: string; shows: number; avgLength: number; coverShare: number };

/** 依演出分類比較歌單：場數、平均每場首數、翻唱占比（INTRO 不算歌）；沒有任何已公開歌單的分類不列出 */
export function statsByCategory(allShows: ArchiveShow[]): CategoryStat[] {
  return SHOW_CATEGORIES.map((c) => {
    const played = allShows
      .filter((s) => s.category === c.value)
      .map((s) => s.songs.filter((x) => !isIntroSong(x.title)))
      .filter((songs) => songs.length > 0);
    const total = played.reduce((n, songs) => n + songs.length, 0);
    const covers = played.reduce((n, songs) => n + songs.filter((x) => x.isCover).length, 0);
    return {
      value: c.value,
      label: c.label,
      shows: played.length,
      avgLength: played.length ? total / played.length : 0,
      coverShare: total ? covers / total : 0
    };
  }).filter((r) => r.shows > 0);
}

function rank(map: Map<string, RankedSong>, limit: number): RankedSong[] {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh-Hant'))
    .slice(0, limit);
}

/** 指定日期（含）之後的演出裡，歌（不含翻唱與 INTRO）被演出最多次的前幾首；since 為 null 代表全部 */
export function rankTopSongs(
  allShows: ArchiveShow[],
  since: string | null,
  limit: number
): { rows: RankedSong[]; showCount: number } {
  const map = new Map<string, RankedSong>();
  let showCount = 0;
  for (const show of allShows) {
    if (since && show.date < since) continue;
    const songs = show.songs.filter((x) => !isIntroSong(x.title));
    if (songs.length === 0) continue;
    showCount += 1;
    for (const song of songs) {
      if (song.isCover) continue;
      const entry = map.get(song.id) ?? { id: song.id, title: song.title, count: 0 };
      entry.count += 1;
      map.set(song.id, entry);
    }
  }
  return { rows: rank(map, limit), showCount };
}

/** 從已公開的場次資料算出各種統計；shows 必須是新到舊排序（getArchive 的順序） */
export function computeStats(allShows: ArchiveShow[]): ArchiveStats {
  // 開場音樂（INTRO）不是歌，先整批排除
  const shows = allShows.map((s) => ({ ...s, songs: s.songs.filter((x) => !isIntroSong(x.title)) }));
  const played = shows.filter((s) => s.songs.length > 0);
  const totalSlots = played.reduce((sum, s) => sum + s.songs.length, 0);

  const plays = new Map<string, RankedSong>(); // 只放原創歌
  const coverPlays = new Map<string, RankedSong>();
  const coverLast = new Map<string, string>();
  const lastPlayed = new Map<string, { title: string; date: string; index: number }>();
  const firstPlay = new Map<string, ArchiveShow>();

  // 由舊到新走一遍，才能抓到「首次演出」與「最近一次」
  const chronological = [...played].reverse();
  chronological.forEach((show, idx) => {
    show.songs.forEach((song) => {
      if (song.isCover) {
        const c = coverPlays.get(song.id) ?? { id: song.id, title: song.title, count: 0 };
        c.count += 1;
        coverPlays.set(song.id, c);
        coverLast.set(song.id, show.date);
        return;
      }
      const entry = plays.get(song.id) ?? { id: song.id, title: song.title, count: 0 };
      entry.count += 1;
      plays.set(song.id, entry);
      if (!firstPlay.has(song.id)) firstPlay.set(song.id, show);
      lastPlayed.set(song.id, { title: song.title, date: show.date, index: idx });
    });
  });

  const originalPlays = Array.from(plays.values()).reduce((n, p) => n + p.count, 0);
  const coverPlaysTotal = Array.from(coverPlays.values()).reduce((n, p) => n + p.count, 0);

  const years = new Map<string, ArchiveShow[]>();
  for (const s of played) {
    const y = s.date.slice(0, 4);
    years.set(y, [...(years.get(y) ?? []), s]);
  }
  const byYear = Array.from(years.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, list]) => ({
      year,
      shows: list.length,
      avgLength: list.reduce((n, s) => n + s.songs.length, 0) / list.length,
      distinctSongs: new Set(list.flatMap((s) => s.songs.filter((x) => !x.isCover).map((x) => x.id))).size
    }));

  const oneTimers = Array.from(plays.values())
    .filter((p) => p.count === 1)
    .map((p) => {
      const show = firstPlay.get(p.id)!;
      return { id: p.id, title: p.title, showTitle: show.title, date: show.date, slug: show.slug };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const latestIndex = chronological.length - 1;
  const dormant = Array.from(lastPlayed.entries())
    .map(([id, v]) => ({
      id,
      title: v.title,
      lastDate: v.date,
      count: plays.get(id)!.count,
      showsSince: latestIndex - v.index
    }))
    .filter((d) => d.count >= 2)
    .sort((a, b) => b.showsSince - a.showsSince || a.lastDate.localeCompare(b.lastDate))
    .slice(0, 5);

  return {
    showsWithSetlist: played.length,
    totalSlots,
    avgLength: played.length ? totalSlots / played.length : 0,
    avgOriginal: played.length ? originalPlays / played.length : 0,
    avgCover: played.length ? coverPlaysTotal / played.length : 0,
    originalSongCount: plays.size,
    coverSongCount: coverPlays.size,
    originalPlays,
    coverPlays: coverPlaysTotal,
    coverSongs: Array.from(coverPlays.values())
      .map((c) => ({ id: c.id, title: c.title, lastDate: coverLast.get(c.id) ?? '' }))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.title.localeCompare(b.title, 'zh-Hant')),
    topSongs: rank(plays, 10),
    byYear,
    oneTimers,
    dormant
  };
}
