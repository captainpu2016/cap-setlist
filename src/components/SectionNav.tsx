'use client';

/** 長頁面的區塊導覽：一排按鈕，點了平滑捲到該區塊；捲動時固定在頁首導覽列下方（歌單統計與巡演足跡共用） */
export default function SectionNav({ sections, label, className = 'mt-10' }: { sections: { id: string; label: string }[]; label: string; className?: string }) {
  // 錨點不用網址 #，因為 # 已經拿來放篩選條件
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <nav aria-label={label} className={`sticky top-14 z-30 -mx-6 border-y border-stage-700 bg-stage-950/90 px-6 backdrop-blur sm:-mx-10 sm:px-10 ${className}`}>
      <ul className="flex gap-1 overflow-x-auto py-2">
        {sections.map((x) => (
          <li key={x.id} className="shrink-0">
            <button
              type="button"
              onClick={() => jump(x.id)}
              className="px-3 py-1.5 font-accent text-xs font-semibold uppercase tracking-[0.15em] text-stone-400 transition-colors hover:text-marquee"
            >
              {x.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
