export const SHOW_CATEGORIES = [
  { value: 'festival', label: '音樂祭' },
  { value: 'own', label: '普隊企劃' },
  { value: 'invited', label: '受邀演出' },
  { value: 'campus', label: '校園' },
  { value: 'gig_event', label: '商演與活動' }
] as const;

export type ShowCategory = (typeof SHOW_CATEGORIES)[number]['value'];

const LABELS = new Map<string, string>(SHOW_CATEGORIES.map((c) => [c.value, c.label]));

export function categoryLabel(value: string | null | undefined): string | null {
  return value ? (LABELS.get(value) ?? null) : null;
}

export function isShowCategory(value: unknown): value is ShowCategory {
  return typeof value === 'string' && LABELS.has(value);
}
