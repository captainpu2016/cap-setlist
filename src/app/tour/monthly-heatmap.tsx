const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/**
 * 逐月演出趨勢：一年一列、十二個月一欄的熱度表。
 * 不用橫向捲動，最新的月份永遠看得到；顏色越紅代表那個月場次越多，點格子可以直接看那個月的場次。
 */
export default function MonthlyHeatmap({
  timeline,
  currentYearMonth
}: {
  timeline: { yearMonth: string; count: number }[];
  currentYearMonth: string;
}) {
  const counts = new Map(timeline.map((m) => [m.yearMonth, m.count]));
  const years = Array.from(new Set(timeline.map((m) => m.yearMonth.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
  const max = Math.max(1, ...timeline.map((m) => m.count));
  const peak = timeline.reduce((best, m) => (m.count > best.count ? m : best), timeline[0]);
  const first = timeline[0].yearMonth;
  const last = timeline[timeline.length - 1].yearMonth;

  return (
    <div className="border-2 border-stage-700 bg-stage-900 p-4 sm:p-6">
      <div className="grid grid-cols-[2.75rem_repeat(12,minmax(0,1fr))_2.75rem] items-end gap-1 font-accent text-[11px] text-stone-500 sm:gap-1.5">
        <span />
        {MONTHS.map((m) => (
          <span key={m} className="text-center">
            {m}
          </span>
        ))}
        <span className="text-right">TOTAL</span>
      </div>

      <div className="mt-2 space-y-1 sm:space-y-1.5">
        {years.map((year) => {
          const total = MONTHS.reduce((sum, _m, i) => sum + (counts.get(`${year}-${String(i + 1).padStart(2, '0')}`) ?? 0), 0);
          return (
            <div
              key={year}
              className="grid grid-cols-[2.75rem_repeat(12,minmax(0,1fr))_2.75rem] items-center gap-1 sm:gap-1.5"
            >
              <span className="font-accent text-sm font-semibold text-paper">{year}</span>
              {MONTHS.map((_m, i) => {
                const ym = `${year}-${String(i + 1).padStart(2, '0')}`;
                const inRange = ym >= first && ym <= last;
                const count = counts.get(ym) ?? 0;
                const isFuture = ym > currentYearMonth;
                if (!inRange || isFuture) {
                  return <span key={ym} aria-hidden className="h-9 border border-dashed border-stage-700/60 sm:h-11" />;
                }
                const base = 'flex h-9 items-center justify-center font-accent text-xs font-semibold sm:h-11 sm:text-sm';
                if (count === 0) {
                  return (
                    <span key={ym} title={`${year}/${i + 1}：沒有演出`} className={`${base} bg-stage-800 text-stone-700`}>
                      ·
                    </span>
                  );
                }
                // 0.3 ~ 1 的紅色濃度，最少的月份也看得出來有演出
                const alpha = 0.3 + (count / max) * 0.7;
                return (
                  <a
                    key={ym}
                    href={`/?year=${year}&month=${String(i + 1).padStart(2, '0')}`}
                    title={`${year}/${i + 1}：${count} 場`}
                    className={`${base} text-paper transition hover:ring-2 hover:ring-paper`}
                    style={{ backgroundColor: `rgba(226, 35, 28, ${alpha})` }}
                  >
                    {count}
                  </a>
                );
              })}
              <span className="text-right font-accent text-sm text-stone-300">{total}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stage-700 pt-4 text-xs text-stone-500">
        <p>
          最忙的月份：<span className="text-paper">{peak.yearMonth.replace('-', '/')}</span>（{peak.count} 場）
        </p>
        <div className="flex items-center gap-2" aria-hidden>
          少
          <span className="h-3 w-24" style={{ backgroundImage: 'linear-gradient(to right, rgba(226,35,28,0.3), rgba(226,35,28,1))' }} />
          多
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-600">點格子可以查看那個月的場次。</p>
    </div>
  );
}
