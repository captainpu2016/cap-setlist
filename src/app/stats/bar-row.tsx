import type { CSSProperties, ReactNode } from 'react';

/**
 * 統計頁共用的橫條：左邊是名稱，中間一條實心長條（所有列的起點與總長度對齊，才好比大小），右邊是數字。
 * 手機版名稱與數字在第一行，長條獨立在第二行。
 */
export function BarRow({
  rank,
  label,
  note,
  percent,
  value,
  valueNote,
  href,
  strong = false,
  labelWidth = '15rem'
}: {
  rank?: string;
  label: ReactNode;
  /** 名稱下方的小字 */
  note?: ReactNode;
  /** 長條長度，0–100 */
  percent: number;
  value: ReactNode;
  valueNote?: ReactNode;
  href?: string;
  /** 突出第一名（紅色長條與名次） */
  strong?: boolean;
  /** 桌機版名稱欄的寬度（CSS 長度） */
  labelWidth?: string;
}) {
  const hasRank = rank !== undefined;
  // 桌機：[名次] 名稱 長條 數字；手機：[名次] 名稱 數字，長條換到第二行
  const desktopCols = `${hasRank ? '1.75rem ' : ''}minmax(0,${labelWidth}) minmax(0,1fr) 4.5rem`;
  const mobileCols = `${hasRank ? '1.75rem ' : ''}minmax(0,1fr) auto`;
  const nameCol = hasRank ? 2 : 1;
  const vars = {
    '--m': mobileCols,
    '--d': desktopCols,
    '--bm': `${nameCol} / -1`, // 手機：長條從名稱欄一路到最右，放在第二行
    '--bd': `${nameCol + 1}`, // 桌機：長條只佔中間那一欄
    '--vm': `${nameCol + 1}`,
    '--vd': `${nameCol + 2}`
  } as CSSProperties;

  const inner = (
    <div className="grid items-center gap-x-3 gap-y-2 [grid-template-columns:var(--m)] sm:gap-x-4 sm:[grid-template-columns:var(--d)]" style={vars}>
      {hasRank && <span className={`font-accent text-sm ${strong ? 'text-signal' : 'text-stone-500'}`}>{rank}</span>}
      <span className="min-w-0">
        <span className={`block truncate text-sm text-paper ${strong ? 'font-bold' : 'font-medium'}`}>{label}</span>
        {note && <span className="block truncate text-[11px] text-stone-500">{note}</span>}
      </span>
      <span className="row-start-2 h-2.5 min-w-0 bg-stage-800 [grid-column:var(--bm)] sm:row-start-1 sm:[grid-column:var(--bd)]" aria-hidden>
        <span className={`block h-full ${strong ? 'bg-signal' : 'bg-signal/65'}`} style={{ width: `${Math.max(1.5, Math.min(100, percent))}%` }} />
      </span>
      <span className="row-start-1 text-right font-accent text-base font-semibold leading-tight text-paper [grid-column:var(--vm)] sm:[grid-column:var(--vd)]">
        {value}
        {valueNote && <span className="block text-[11px] font-normal text-stone-500">{valueNote}</span>}
      </span>
    </div>
  );
  const cls = 'block border-b border-stage-700/60 py-3 last:border-b-0';
  return (
    <li>
      {href ? (
        <a href={href} className={`${cls} transition-colors hover:bg-stage-900/70`}>
          {inner}
        </a>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </li>
  );
}
