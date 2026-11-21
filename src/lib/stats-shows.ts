import { getArchive } from '@/lib/archive';
import { getCity } from '@/lib/format';
import { countryOfVenue, isOverseasVenue } from '@/lib/geo';
import type { ArchiveShow } from '@/lib/stats';

/** 統計頁與巡演頁共用的「篩選用場次資料」：兩頁用同一份欄位、同一套算法，篩選結果才會一致 */
export type FilterShow = {
  slug: string;
  date: string;
  category: string | null;
  series: string | null;
  admission: string | null;
  country: string | null;
  city: string | null;
};

export async function getFilterShows(): Promise<FilterShow[]> {
  const { shows } = await getArchive();
  return shows.map((x) => ({
    slug: x.slug,
    date: x.date,
    category: x.category,
    series: x.series,
    admission: x.admission,
    country: countryOfVenue(x.venue),
    city: getCity(x.venue)
  }));
}

/** 統計用的完整場次資料（含歌單），歌單統計頁與巡演足跡頁的比較區塊共用 */
export type StatsShow = ArchiveShow & {
  series: string | null;
  admission: string | null;
  overseas: boolean;
  country: string | null;
  city: string | null;
};

export async function getStatsShows(): Promise<StatsShow[]> {
  const { shows } = await getArchive();
  return shows.map((x) => ({
    id: x.id,
    slug: x.slug,
    title: x.title,
    date: x.date,
    venue: x.venue,
    category: x.category,
    series: x.series,
    admission: x.admission,
    overseas: isOverseasVenue(x.venue),
    country: countryOfVenue(x.venue),
    city: getCity(x.venue),
    songs: x.songs.map((song) => ({ id: song.id, title: song.title, isCover: song.isCover }))
  }));
}
