'use client';

const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

export default function FilterBar({
  years,
  months,
  venues,
  cities,
  selectedYear,
  selectedMonth,
  selectedVenue,
  selectedCity,
  hasFilter
}: {
  years: string[];
  months: string[];
  venues: string[];
  cities: string[];
  selectedYear: string;
  selectedMonth: string;
  selectedVenue: string;
  selectedCity: string;
  hasFilter: boolean;
}) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.currentTarget.form?.submit();
  }

  return (
    <form
      method="get"
      className="mb-8 flex flex-col gap-3 rounded-lg border border-stage-700 bg-stage-900/60 p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="grid grid-cols-2 gap-3 sm:contents">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-stone-500" htmlFor="year">
            年份
          </label>
          <select
            id="year"
            name="year"
            defaultValue={selectedYear}
            onChange={handleChange}
            className="w-full rounded-md border border-stage-700 bg-stage-950 px-3 py-2 text-sm text-paper focus:border-marquee focus:outline-none sm:w-auto sm:py-1.5"
          >
            <option value="">全部年份</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y} 年
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-stone-500" htmlFor="month">
            月份
          </label>
          <select
            id="month"
            name="month"
            defaultValue={selectedMonth}
            onChange={handleChange}
            className="w-full rounded-md border border-stage-700 bg-stage-950 px-3 py-2 text-sm text-paper focus:border-marquee focus:outline-none sm:w-auto sm:py-1.5"
          >
            <option value="">全部月份</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {MONTH_LABELS[Number(m) - 1]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:contents">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-stone-500" htmlFor="city">
            城市
          </label>
          <select
            id="city"
            name="city"
            defaultValue={selectedCity}
            onChange={handleChange}
            className="w-full rounded-md border border-stage-700 bg-stage-950 px-3 py-2 text-sm text-paper focus:border-marquee focus:outline-none sm:w-auto sm:py-1.5"
          >
            <option value="">全部城市</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-stone-500" htmlFor="venue">
            場地
          </label>
          <select
            id="venue"
            name="venue"
            defaultValue={selectedVenue}
            onChange={handleChange}
            className="w-full rounded-md border border-stage-700 bg-stage-950 px-3 py-2 text-sm text-paper focus:border-marquee focus:outline-none sm:w-auto sm:max-w-[14rem] sm:py-1.5"
          >
            <option value="">全部場地</option>
            {venues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasFilter && (
        <a href="/" className="text-xs uppercase tracking-widest text-stone-500 hover:text-marquee">
          清除篩選
        </a>
      )}

      {/* 給不支援 JS 的情境／鍵盤直接按 Enter 送出用的備援按鈕，平常選單改變會自動送出，這顆不會太顯眼 */}
      <noscript>
        <button
          type="submit"
          className="rounded-md bg-marquee px-4 py-1.5 text-sm font-bold text-stage-950 transition hover:bg-marquee/80"
        >
          篩選
        </button>
      </noscript>
    </form>
  );
}
