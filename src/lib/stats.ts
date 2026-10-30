import { isIntroSong, type ArchiveShow } from '@/lib/archive';

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
  topCovers: RankedSong[];
  longest: { show: ArchiveShow; length: number } | null;
  shortest: { show: ArchiveShow; length: number } | null;
  topSongs: RankedSong[];
  openers: RankedSong[];
  closers: RankedSong[];
  byYear: { year: string; shows: number; avgLength: number; distinctSongs: number }[];
  oneTimers: { id: string; title: string; showTitle: string; date: string; slug: string }[];
  dormant: { id: string; title: string; lastDate: string; count: number; showsSince: number }[];
};

function rank(map: Map<string, RankedSong>, limit: number): RankedSong[] {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh-Hant'))
    .slice(0, limit);
}

/** 從已公開的場次資料算出各種統計；shows 必須是新到舊排序（getArchive 的順序） */
export function computeStats(allShows: ArchiveShow[]): ArchiveStats {
  // 開場音樂（INTRO）不是歌，先整批排除，這樣「開場曲」會是真正的第一首歌
  const shows = allShows.map((s) => ({ ...s, songs: s.songs.filter((x) => !isIntroSong(x.title)) }));
  const played = shows.filter((s) => s.songs.length > 0);
  const totalSlots = played.reduce((sum, s) => sum + s.songs.length, 0);

  const plays = new Map<string, RankedSong>(); // 只放原創歌
  const coverPlays = new Map<string, RankedSong>();
  const openers = new Map<string, RankedSong>();
  const closers = new Map<string, RankedSong>();
  const lastPlayed = new Map<string, { title: string; date: string; index: number }>();
  const firstPlay = new Map<string, ArchiveShow>();

  // 由舊到新走一遍，才能抓到「首次演出」與「最近一次」
  const chronological = [...played].reverse();
  chronological.forEach((show, idx) => {
    show.songs.forEach((song, i) => {
      if (song.isCover) {
        const c = coverPlays.get(song.id) ?? { id: song.id, title: song.title, count: 0 };
        c.count += 1;
        coverPlays.set(song.id, c);
        return;
      }
      const entry = plays.get(song.id) ?? { id: song.id, title: song.title, count: 0 };
      entry.count += 1;
      plays.set(song.id, entry);
      if (!firstPlay.has(song.id)) firstPlay.set(song.id, show);
      lastPlayed.set(song.id, { title: song.title, date: show.date, index: idx });
      if (i === 0) {
        const o = openers.get(song.id) ?? { id: song.id, title: song.title, count: 0 };
        o.count += 1;
        openers.set(song.id, o);
      }
      if (i === show.songs.length - 1) {
        const c = closers.get(song.id) ?? { id: song.id, title: song.title, count: 0 };
        c.count += 1;
        closers.set(song.id, c);
      }
    });
  });

  const longest = played.reduce<ArchiveStats['longest']>(
    (best, s) => (!best || s.songs.length > best.length ? { show: s, length: s.songs.length } : best),
    null
  );
  const shortest = played.reduce<ArchiveStats['shortest']>(
    (best, s) => (!best || s.songs.length < best.length ? { show: s, length: s.songs.length } : best),
    null
  );

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
    topCovers: rank(coverPlays, 5),
    longest,
    shortest,
    topSongs: rank(plays, 10),
    openers: rank(openers, 5),
    closers: rank(closers, 5),
    byYear,
    oneTimers,
    dormant
  };
}
