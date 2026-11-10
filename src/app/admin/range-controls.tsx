import Link from 'next/link';
import type { RangePreset, ResolvedRange } from '@/lib/date-range';

/** 日期區間控制：預設天數按鈕 + 自訂起迄日。extra 是要一起帶著走的網址參數（例如 tab=search） */
export default function RangeControls({
  presets,
  range,
  basePath,
  extra = {}
}: {
  presets: RangePreset[];
  range: ResolvedRange;
  basePath: string;
  extra?: Record<string, string>;
}) {
  const presetHref = (key: string) => {
    const p = new URLSearchParams({ ...extra, range: key });
    return basePath + '?' + p.toString();
  };
  const fmt = (d: string) => d.replace(/-/g, '/');

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-stone-200 bg-white p-1 text-sm">
        {presets.map((r) => (
          <Link
            key={r.key}
            href={presetHref(r.key)}
            className={'rounded px-3 py-1 ' + (range.preset?.key === r.key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <form
        method="get"
        action={basePath}
        className={'mt-3 flex w-full flex-wrap items-end gap-3 rounded-md border bg-white p-3 text-sm ' + (range.custom ? 'border-stone-900' : 'border-stone-200')}
      >
        {Object.entries(extra).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="block">
          <span className="mb-1 block text-xs text-stone-500">自訂起始日</span>
          <input type="date" name="from" defaultValue={range.from} max={range.today} required className="admin-input !w-40 !py-1.5" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-stone-500">結束日</span>
          <input type="date" name="to" defaultValue={range.to} max={range.today} required className="admin-input !w-40 !py-1.5" />
        </label>
        <button type="submit" className="admin-btn !py-1.5">
          套用
        </button>
        <p className="pb-1.5 text-xs text-stone-400">
          {fmt(range.from)} – {fmt(range.to)}（共 {range.dayCount} 天），對照前一段 {fmt(range.prevFrom)} – {fmt(range.prevTo)}
        </p>
        {range.note && (
          <p className="w-full text-xs text-red-600">
            {range.note}已改回預設區間。
          </p>
        )}
      </form>
    </>
  );
}
