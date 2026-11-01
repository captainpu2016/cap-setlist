import { admissionLabel, categoryLabel } from '@/lib/show-category';

/** 場次篩選（全部場次頁與歌單統計頁共用）：分類、入場方式、國家（可再選城市），可以同時使用 */

export type Admission = 'all' | 'paid' | 'free' | 'private';

export interface ShowFilter {
  category: string | null;
  admission: Admission;
  /** 國家（台灣、日本…） */
  country: string | null;
  /** 選了國家之後，可以再選城市（場地欄位的第一個詞，例如「高雄」「大阪」） */
  city: string | null;
}

export const EMPTY_FILTER: ShowFilter = { category: null, admission: 'all', country: null, city: null };

export interface FilterableShow {
  category: string | null;
  admission: string | null;
  country: string | null;
  city: string | null;
}

export function isFiltered(f: ShowFilter): boolean {
  return Boolean(f.category) || f.admission !== 'all' || Boolean(f.country) || Boolean(f.city);
}

/** 網址 # 後面的參數：c 分類、a 入場方式、co 國家、ct 城市。舊連結的 o=0（台灣）仍可用 */
export function parseHash(hash: string): ShowFilter {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const a = p.get('a');
  const o = p.get('o');
  return {
    category: p.get('c') || null,
    admission: a === 'paid' || a === 'free' || a === 'private' ? a : 'all',
    country: p.get('co') || (o === '0' ? '台灣' : null),
    city: p.get('ct') || null
  };
}

export function buildHash(f: ShowFilter): string {
  const p = new URLSearchParams();
  if (f.category) p.set('c', f.category);
  if (f.admission !== 'all') p.set('a', f.admission);
  if (f.country) p.set('co', f.country);
  if (f.city) p.set('ct', f.city);
  const q = p.toString();
  return q ? `#${q}` : '';
}

export function matchesFilter(show: FilterableShow, f: ShowFilter): boolean {
  if (f.category && show.category !== f.category) return false;
  if (f.country && show.country !== f.country) return false;
  if (f.city && show.city !== f.city) return false;
  if (f.admission !== 'all' && show.admission !== f.admission) return false;
  return true;
}

/** 目前篩選條件的文字描述，例如「音樂祭/節・海外・免費」 */
export function filterLabel(f: ShowFilter): string {
  return [
    f.category ? (categoryLabel(f.category) ?? f.category) : null,
    f.admission !== 'all' ? admissionLabel(f.admission) : null,
    f.country,
    f.city
  ]
    .filter(Boolean)
    .join('・');
}
