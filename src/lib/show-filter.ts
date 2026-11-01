import { admissionLabel, categoryLabel } from '@/lib/show-category';

/** 場次篩選（全部場次頁與歌單統計頁共用）：分類、系列、地區、入場方式四個條件，可以同時使用 */

export type Region = 'all' | 'overseas' | 'taiwan';
export type Admission = 'all' | 'paid' | 'free' | 'private';

export interface ShowFilter {
  category: string | null;
  series: string | null;
  region: Region;
  admission: Admission;
}

export const EMPTY_FILTER: ShowFilter = { category: null, series: null, region: 'all', admission: 'all' };

export interface FilterableShow {
  category: string | null;
  series: string | null;
  admission: string | null;
  overseas: boolean;
}

export function isFiltered(f: ShowFilter): boolean {
  return Boolean(f.category || f.series) || f.region !== 'all' || f.admission !== 'all';
}

/** 網址 # 後面的參數：c 分類、s 系列、o（1 海外／0 台灣）、a 入場方式。舊連結（例如 #o=1）照樣可用 */
export function parseHash(hash: string): ShowFilter {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const a = p.get('a');
  const o = p.get('o');
  return {
    category: p.get('c') || null,
    series: p.get('s') || null,
    region: o === '1' ? 'overseas' : o === '0' ? 'taiwan' : 'all',
    admission: a === 'paid' || a === 'free' || a === 'private' ? a : 'all'
  };
}

export function buildHash(f: ShowFilter): string {
  const p = new URLSearchParams();
  if (f.category) p.set('c', f.category);
  if (f.series) p.set('s', f.series);
  if (f.region !== 'all') p.set('o', f.region === 'overseas' ? '1' : '0');
  if (f.admission !== 'all') p.set('a', f.admission);
  const q = p.toString();
  return q ? `#${q}` : '';
}

export function matchesFilter(show: FilterableShow, f: ShowFilter): boolean {
  if (f.category && show.category !== f.category) return false;
  if (f.series && show.series !== f.series) return false;
  if (f.region === 'overseas' && !show.overseas) return false;
  if (f.region === 'taiwan' && show.overseas) return false;
  if (f.admission !== 'all' && show.admission !== f.admission) return false;
  return true;
}

/** 目前篩選條件的文字描述，例如「音樂祭/節・海外・免費」 */
export function filterLabel(f: ShowFilter): string {
  return [
    f.category ? (categoryLabel(f.category) ?? f.category) : null,
    f.series,
    f.region === 'overseas' ? '海外' : f.region === 'taiwan' ? '台灣' : null,
    f.admission !== 'all' ? admissionLabel(f.admission) : null
  ]
    .filter(Boolean)
    .join('・');
}
