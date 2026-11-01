import { showTagLabels } from '@/lib/show-tags';

/** 場次卡片上的小標籤列（分類／入場方式／海外） */
export default function ShowTags({
  show,
  className = ''
}: {
  show: { category?: string | null; admission?: string | null; venue?: string | null };
  className?: string;
}) {
  const labels = showTagLabels(show);
  if (labels.length === 0) return null;
  return (
    <p className={`flex flex-wrap gap-1.5 ${className}`}>
      {labels.map((l) => (
        <span
          key={l}
          className={`border px-1.5 py-px text-[10px] leading-4 ${l === '海外' ? 'border-signal/60 text-signal' : 'border-stage-700 text-stone-400'}`}
        >
          {l}
        </span>
      ))}
    </p>
  );
}
