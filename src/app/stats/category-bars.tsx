import { BarRow } from '@/components/BarRow';
import type { CategoryStat } from '@/lib/stats';

/** 不同類型的演出：長條是場數（相對最多的類型），名稱下方是平均每場首數與翻唱占比 */
export default function CategoryBars({ rows }: { rows: CategoryStat[] }) {
  const max = Math.max(1, ...rows.map((r) => r.shows));
  return (
    <ol className="border-y border-stage-700">
      {rows.map((r, i) => (
        <BarRow
          key={r.value}
          label={r.label}
          note={`平均每場 ${r.avgLength.toFixed(1)} 首・翻唱 ${Math.round(r.coverShare * 100)}%`}
          percent={(r.shows / max) * 100}
          value={
            <>
              {r.shows}
              <span className="ml-0.5 text-[11px] font-normal text-stone-400"> 場</span>
            </>
          }
          href={`/shows#c=${r.value}`}
          strong={i === 0}
          labelWidth="12rem"
        />
      ))}
    </ol>
  );
}
