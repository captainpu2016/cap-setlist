import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import { getCity } from '@/lib/format';
import type { ShowCategory } from '@/lib/show-category';

export type ArchiveShow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  venue: string | null;
  coverImageUrl: string | null;
  updatedAt: string;
  /** 演出分類與系列；資料庫還沒執行 0005_show_category.sql 時都是 null */
  category: ShowCategory | null;
  series: string | null;
  admission: 'paid' | 'free' | null;
  songs: { id: string; title: string; durationSeconds: number | null; isCover: boolean }[];
  /** 歌單是否已公開（未公開時 songs 是空的，避免提早洩漏） */
  revealed: boolean;
};

export type ArchiveSong = {
  id: string;
  title: string;
  isCover: boolean;
  shows: { slug: string; title: string; date: string; venue: string | null }[];
};

interface Row {
  id: string;
  slug: string;
  title: string;
  show_date: string;
  venue: string | null;
  cover_image_url: string | null;
  setlist_reveal_at: string | null;
  updated_at: string;
  setlist_items: {
    position: number;
    is_placeholder: boolean;
    song: { id: string; title: string; duration_seconds: number | null; album: { is_cover: boolean } | null } | null;
  }[];
}

/** 翻唱歌：專輯標記為翻唱專輯，或歌名以「(Cover)」開頭（後台沒歸到翻唱專輯時的備援） */
export function isCoverSong(title: string, albumIsCover: boolean | null | undefined): boolean {
  return albumIsCover === true || /^\s*[(（]cover[)）]/i.test(title);
}

/** 開場音樂（歌名以「INTRO」開頭，例如「INTRO: Endless Trip」）：不算歌曲，統計時排除 */
export function isIntroSong(title: string): boolean {
  return /^\s*intro\b/i.test(title);
}

/** 翻唱歌的歌名慣例是「(Cover) 歌名 (原唱)」：拆出歌名與原唱，沒有括號時原唱為 null */
export function parseCoverTitle(title: string): { name: string; artist: string | null } {
  const shown = displaySongTitle(title);
  const m = shown.match(/^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/);
  return m && m[1] ? { name: m[1], artist: m[2].trim() } : { name: shown, artist: null };
}

/** 顯示用歌名：去掉開頭的「(Cover) 」標記 */
export function displaySongTitle(title: string): string {
  return title.replace(/^\s*[(（]cover[)）]\s*/i, '');
}

/**
 * 整份公開資料（已發布場次＋已公開歌單）的唯一入口，給 llms.txt、關於頁、歌曲頁、sitemap 共用。
 * 用 react cache 讓同一個請求內只查一次；資料本身另外有 Data Cache（見 supabase/public.ts）。
 */
export const getArchive = cache(async () => {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('shows')
    .select(
      'id, slug, title, show_date, venue, cover_image_url, setlist_reveal_at, updated_at, setlist_items(position, is_placeholder, song:songs(id, title, duration_seconds, album:albums(is_cover)))'
    )
    .eq('status', 'published')
    .order('show_date', { ascending: false })
    .returns<Row[]>();

  // 分類與系列用獨立查詢：欄位還不存在時這個查詢會失敗，忽略即可，不能拖垮整份公開資料
  const metaRes = await supabase
    .from('shows')
    .select('id, category, series')
    .eq('status', 'published')
    .returns<{ id: string; category: ShowCategory | null; series: string | null }[]>();
  const meta = new Map((metaRes.error ? [] : (metaRes.data ?? [])).map((m) => [m.id, m]));
  // 入場方式是更晚加的欄位（0007），獨立查詢，失敗就當作都沒填
  const admRes = await supabase.from('shows').select('id, admission').eq('status', 'published').returns<{ id: string; admission: 'paid' | 'free' | null }[]>();
  const admission = new Map((admRes.error ? [] : (admRes.data ?? [])).map((m) => [m.id, m.admission]));

  const now = new Date();
  const shows: ArchiveShow[] = (data ?? []).map((row) => {
    const revealed = !row.setlist_reveal_at || new Date(row.setlist_reveal_at) <= now;
    const songs = revealed
      ? [...row.setlist_items]
          .sort((a, b) => a.position - b.position)
          .filter((i) => !i.is_placeholder && i.song)
          .map((i) => ({
            id: i.song!.id,
            title: i.song!.title,
            durationSeconds: i.song!.duration_seconds,
            isCover: isCoverSong(i.song!.title, i.song!.album?.is_cover)
          }))
      : [];
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      date: row.show_date,
      venue: row.venue,
      coverImageUrl: row.cover_image_url,
      updatedAt: row.updated_at,
      category: meta.get(row.id)?.category ?? null,
      series: meta.get(row.id)?.series ?? null,
      admission: admission.get(row.id) ?? null,
      songs,
      revealed
    };
  });

  const songMap = new Map<string, ArchiveSong>();
  for (const show of shows) {
    for (const s of show.songs) {
      const entry = songMap.get(s.id) ?? { id: s.id, title: s.title, isCover: s.isCover, shows: [] };
      if (!entry.shows.some((x) => x.slug === show.slug)) {
        entry.shows.push({ slug: show.slug, title: show.title, date: show.date, venue: show.venue });
      }
      songMap.set(s.id, entry);
    }
  }
  const songs = Array.from(songMap.values()).sort(
    (a, b) => b.shows.length - a.shows.length || a.title.localeCompare(b.title, 'zh-Hant')
  );

  const today = new Date().toISOString().slice(0, 10);
  const past = shows.filter((s) => s.date <= today);
  const cities = Array.from(new Set(shows.map((s) => getCity(s.venue)).filter((c): c is string => Boolean(c))));

  return {
    shows,
    songs,
    stats: {
      showCount: shows.length,
      songCount: songs.length,
      cityCount: cities.length,
      firstDate: shows.length ? shows[shows.length - 1].date : null,
      latestPastDate: past.length ? past[0].date : null,
      lastUpdated: shows.reduce((max, s) => (s.updatedAt > max ? s.updatedAt : max), '')
    }
  };
});
