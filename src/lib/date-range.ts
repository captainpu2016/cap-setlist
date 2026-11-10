import { todayTaipei } from '@/lib/format';

/** 後台數據頁共用的日期區間：預設的幾個天數，加上自訂起迄日（台灣時間），並算出前一段同長度的對照期 */

export interface RangePreset {
  key: string;
  label: string;
  days: number;
}

export interface ResolvedRange {
  today: string;
  from: string;
  to: string;
  dayCount: number;
  prevFrom: string;
  prevTo: string;
  /** 使用者有沒有自訂起迄日 */
  custom: boolean;
  /** 目前選中的預設天數（自訂時是 null） */
  preset: RangePreset | null;
  /** 自訂日期不合格時的說明 */
  note: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_RANGE_DAYS = 366;

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()) / 86_400_000) + 1;
}

export function resolveRange(
  searchParams: { range?: string; from?: string; to?: string },
  presets: RangePreset[],
  defaultKey: string,
  /** 資料延遲天數：預設區間結束在這幾天前（Search Console 約 2 天，GA4 為 0） */
  lagDays = 0
): ResolvedRange {
  const today = todayTaipei();
  const latest = addDays(today, -lagDays);
  const preset = presets.find((p) => p.key === searchParams.range) ?? presets.find((p) => p.key === defaultKey) ?? presets[0];

  let custom: { from: string; to: string } | null = null;
  let note: string | null = null;
  if (searchParams.from || searchParams.to) {
    const { from, to } = searchParams;
    if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) note = '請同時選好起始日與結束日。';
    else if (from > to) note = '起始日不能晚於結束日。';
    else if (to > today) note = '結束日不能晚於今天。';
    else if (daysBetween(from, to) > MAX_RANGE_DAYS) note = '一次最多查詢 ' + MAX_RANGE_DAYS + ' 天。';
    else custom = { from, to };
  }

  const to = custom ? custom.to : latest;
  const from = custom ? custom.from : addDays(latest, -(preset.days - 1));
  const dayCount = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(dayCount - 1));
  return { today, from, to, dayCount, prevFrom, prevTo, custom: Boolean(custom), preset: custom ? null : preset, note };
}
