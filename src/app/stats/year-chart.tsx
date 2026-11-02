import type { ArchiveStats } from '@/lib/stats';
import { BarRow } from '@/components/BarRow';

/** 每年的歌單：一年一列，長條是當年的場數，右邊是場數，名稱下方是平均首數與不同歌曲數 */
export default function YearChart({ byYear }: { byYear: ArchiveStats['byYear'] }) {
  const max = Math.max(1, ...byYear.map((y) => y.shows));
  return (
    <ol className="border-y border-stage-700">
      {byYear.map((y) => (
        <BarRow
          key={y.year}
          label={<span className="font-accent text-lg">{y.year}</span>}
          note={`平均每場 ${y.avgLength.toFixed(1)} 首・${y.distinctSongs} 首不同的歌`}
          percent={(y.shows / max) * 100}
          value={
            <>
              {y.shows}
              <span className="ml-0.5 text-[11px] font-normal text-stone-400"> 場</span>
            </>
          }
          strong
          labelWidth="13rem"
        />
      ))}
    </ol>
  );
}
