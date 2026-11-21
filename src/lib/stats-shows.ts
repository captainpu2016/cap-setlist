import { getArchive } from '@/lib/archive';
import { getCity } from '@/lib/format';
import { countryOfVenue } from '@/lib/geo';

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
