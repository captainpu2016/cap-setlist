/** 場次篩選（全部場次頁與歌單統計頁共用）：分類／系列／海外三選一，再疊加入場方式 */

export type Filter =
  | { kind: 'all' }
  | { kind: 'category'; value: string }
  | { kind: 'series'; value: string }
  | { kind: 'overseas' };

export type Admission = 'all' | 'paid' | 'free' | 'private';

export interface FilterableShow {
  category: string | null;
  series: string | null;
  admission: string | null;
  overseas: boolean;
}

export function parseHash(hash: string): { filter: Filter; admission: Admission } {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const a = p.get('a');
  const admission: Admission = a === 'paid' || a === 'free' || a === 'private' ? a : 'all';
  if (p.get('o')) return { filter: { kind: 'overseas' }, admission };
  if (p.get('c')) return { filter: { kind: 'category', value: p.get('c')! }, admission };
  if (p.get('s')) return { filter: { kind: 'series', value: p.get('s')! }, admission };
  return { filter: { kind: 'all' }, admission };
}

export function buildHash(filter: Filter, admission: Admission): string {
  const p = new URLSearchParams();
  if (filter.kind === 'category') p.set('c', filter.value);
  else if (filter.kind === 'series') p.set('s', filter.value);
  else if (filter.kind === 'overseas') p.set('o', '1');
  if (admission !== 'all') p.set('a', admission);
  const q = p.toString();
  return q ? `#${q}` : '';
}

export function matchesMain(show: FilterableShow, filter: Filter): boolean {
  if (filter.kind === 'category') return show.category === filter.value;
  if (filter.kind === 'series') return show.series === filter.value;
  if (filter.kind === 'overseas') return show.overseas;
  return true;
}

export function matchesFilter(show: FilterableShow, filter: Filter, admission: Admission): boolean {
  return matchesMain(show, filter) && (admission === 'all' || show.admission === admission);
}
