import type { ArchiveStats } from '@/lib/stats';

/**
 * 每年的歌單：直條圖，一年一根，高度是當年的演出場數；最近一年用亮紅色，其他年份淡一點。
 * 每根下面是年份，再下面是平均每場首數與不同歌曲數。
 */
export default function YearChart({ byYear }: { byYear: ArchiveStats['byYear'] }) {
  const max = Math.max(1, ...byYear.map((y) => y.shows));
  const latest = byYear[byYear.length - 1]?.year;
  const AREA = 168; // 直條可用的最大高度（px）
  return (
    <div>
      <ol className="flex items-end justify-around gap-3 border-b border-stage-700 pb-0 sm:gap-6" style={{ minHeight: AREA + 32 }}>
        {byYear.map((y) => {
          const h = Math.max(6, Math.round((y.shows / max) * AREA));
          const isLatest = y.year === latest;
          return (
            <li
              key={y.year}
              className="group flex w-full max-w-[96px] flex-col items-center"
              title={`${y.year} 年：${y.shows} 場、平均每場 ${y.avgLength.toFixed(1)} 首、${y.distinctSongs} 首不同的歌`}
            >
              <span className={`mb-2 font-accent text-2xl font-bold tabular-nums leading-none ${isLatest ? 'text-paper' : 'text-stone-300'}`}>
                {y.shows}
                <span className="ml-0.5 text-[11px] font-normal text-stone-500">場</span>
              </span>
              <span
                className={`block w-full rounded-t-[4px] transition-opacity group-hover:opacity-100 ${isLatest ? 'bg-signal' : 'bg-signal/55 opacity-90'}`}
                style={{ height: h }}
                aria-hidden
              />
            </li>
          );
        })}
      </ol>
      <ol className="flex justify-around gap-3 sm:gap-6">
        {byYear.map((y) => (
          <li key={y.year} className="w-full max-w-[96px] pt-3 text-center">
            <p className={`font-accent text-lg font-semibold ${y.year === latest ? 'text-paper' : 'text-stone-400'}`}>{y.year}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              平均 <span className="tabular-nums text-stone-300">{y.avgLength.toFixed(1)}</span> 首
              <br />
              <span className="tabular-nums text-stone-300">{y.distinctSongs}</span> 首不同
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
