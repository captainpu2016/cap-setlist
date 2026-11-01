import type { ArchiveStats } from '@/lib/stats';

/** 每年的歌單：直立長條是當年的場數，下方是平均首數與不同歌曲數 */
export default function YearChart({ byYear }: { byYear: ArchiveStats['byYear'] }) {
  const max = Math.max(1, ...byYear.map((y) => y.shows));
  return (
    <div className="flex items-end gap-3 border-b border-stage-700 pb-1" style={{ minHeight: '13rem' }}>
      {byYear.map((y) => (
        <div key={y.year} className="flex min-w-0 flex-1 flex-col items-center" title={`${y.year}：${y.shows} 場、平均 ${y.avgLength.toFixed(1)} 首、${y.distinctSongs} 首不同的歌`}>
          <span className="mb-1 font-accent text-sm font-semibold text-paper">{y.shows}<span className="ml-0.5 text-[11px] font-normal text-stone-400"> 場</span></span>
          <div className="flex w-full items-end" style={{ height: '8rem' }}>
            <div className="w-full border-t-2 border-signal bg-signal/30" style={{ height: `${Math.max(4, (y.shows / max) * 100)}%` }} />
          </div>
          <span className="mt-2 font-accent text-lg font-semibold text-paper">{y.year}</span>
          <span className="text-center text-[11px] leading-tight text-stone-400">
            平均 {y.avgLength.toFixed(1)} 首
            <span className="block text-stone-600">{y.distinctSongs} 首不同的歌</span>
          </span>
        </div>
      ))}
    </div>
  );
}
