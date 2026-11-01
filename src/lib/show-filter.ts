import { admissionLabel, categoryLabel } from '@/lib/show-category';

/** 場次篩選（全部場次頁與歌單統計頁共用）：分類、地區（台灣／海外，可再選城市）、入場方式，可以同時使用 */

export type Region = 'all' | 'overseas' | 'taiwan';
export type Admission = 'all' | 'paid' | 'free' | 'private';

export interface ShowFilter {
  category: string | null;
  region: Region;
  /** 地區選了台灣或海外之後，可以再選城市（場地欄位的第一個詞，例如「高雄」「大阪」） */
  city: string | null;
  admission: Admission;
}

export const EMPTY_FILTER: ShowFilter = { category: null, region: 'all', city: null, admission: 'all' };

export interface FilterableShow {
  category: string | null;
  admission: string | null;
  overseas: boolean;
  city: string | null;
}

export function isFiltered(f: ShowFilter): boolean {
  return Boolean(f.category) || f.region !== 'all' || Boolean(f.city) || f.admission !== 'all';
}

/** 網址 # 後面的參數：c 分類、o（1 海外／0 台灣）、ct 城市、a 入場方式。舊連結（例如 #o=1）照樣可用 */
export function parseHash(hash: string): ShowFilter {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const a = p.get('a');
  const o = p.get('o');
  return {
    category: p.get('c') || null,
    region: o === '1' ? 'overseas' : o === '0' ? 'taiwan' : 'all',
    city: p.get('ct') || null,
    admission: a === 'paid' || a === 'free' || a === 'private' ? a : 'all'
  };
}

export function buildHash(f: ShowFilter): string {
  const p = new URLSearchParams();
  if (f.category) p.set('c', f.category);
  if (f.region !== 'all') p.set('o', f.region === 'overseas' ? '1' : '0');
  if (f.city) p.set('ct', f.city);
  if (f.admission !== 'all') p.set('a', f.admission);
  const q = p.toString();
  return q ? `#${q}` : '';
}

export function matchesFilter(show: FilterableShow, f: ShowFilter): boolean {
  if (f.category && show.category !== f.category) return false;
  if (f.region === 'overseas' && !show.overseas) return false;
  if (f.region === 'taiwan' && show.overseas) return false;
  if (f.city && show.city !== f.city) return false;
  if (f.admission !== 'all' && show.admission !== f.admission) return false;
  return true;
}

/** 目前篩選條件的文字描述，例如「音樂祭/節・海外・免費」 */
export function filterLabel(f: ShowFilter): string {
  return [
    f.category ? (categoryLabel(f.category) ?? f.category) : null,
    f.region === 'overseas' ? '海外' : f.region === 'taiwan' ? '台灣' : null,
    f.city,
    f.admission !== 'all' ? admissionLabel(f.admission) : null
  ]
    .filter(Boolean)
    .join('・');
}
