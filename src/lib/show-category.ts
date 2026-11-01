export const SHOW_CATEGORIES = [
  { value: 'festival', label: '音樂祭/節' },
  { value: 'own', label: '普隊企劃' },
  { value: 'invited', label: '樂團邀演' },
  { value: 'gig_event', label: '場館邀演' }, // 資料值沿用早期的 gig_event
  { value: 'commercial', label: '其他' },
  { value: 'campus', label: '校園' }
] as const;

export const ADMISSIONS = [
  { value: 'paid', label: '付費' },
  { value: 'free', label: '免費' }
] as const;

export type Admission = (typeof ADMISSIONS)[number]['value'];

export function admissionLabel(value: string | null | undefined): string | null {
  return ADMISSIONS.find((a) => a.value === value)?.label ?? null;
}

export function isAdmission(value: unknown): value is Admission {
  return value === 'paid' || value === 'free';
}

export type ShowCategory = (typeof SHOW_CATEGORIES)[number]['value'];

const LABELS = new Map<string, string>(SHOW_CATEGORIES.map((c) => [c.value, c.label]));

export function categoryLabel(value: string | null | undefined): string | null {
  return value ? (LABELS.get(value) ?? null) : null;
}

export function isShowCategory(value: unknown): value is ShowCategory {
  return typeof value === 'string' && LABELS.has(value);
}
