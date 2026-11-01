'use client';

import { useState, useTransition } from 'react';
import { updateShowClassification } from './actions';
import { SHOW_CATEGORIES } from '@/lib/show-category';

type State = 'idle' | 'saved' | 'error';

/** 場次列表上的分類／系列欄：改了就自動儲存（分類選了立刻存，系列輸入完離開欄位時存） */
export default function ClassificationCell({
  showId,
  category,
  series
}: {
  showId: string;
  category: string | null;
  series: string | null;
}) {
  const [cat, setCat] = useState(category ?? '');
  const [ser, setSer] = useState(series ?? '');
  const [saved, setSaved] = useState({ cat: category ?? '', ser: series ?? '' });
  const [state, setState] = useState<State>('idle');
  const [pending, startTransition] = useTransition();

  function save(nextCat: string, nextSer: string) {
    if (nextCat === saved.cat && nextSer.trim() === saved.ser) return;
    setState('idle');
    startTransition(async () => {
      try {
        await updateShowClassification(showId, nextCat, nextSer);
        setSaved({ cat: nextCat, ser: nextSer.trim() });
        setState('saved');
        setTimeout(() => setState('idle'), 2000);
      } catch {
        setState('error');
      }
    });
  }

  return (
    <div className="min-w-[11rem] space-y-1.5">
      <select
        value={cat}
        disabled={pending}
        onChange={(e) => {
          setCat(e.target.value);
          save(e.target.value, ser);
        }}
        aria-label="演出分類"
        className={`admin-input !py-1 text-xs ${cat ? '' : 'border-amber-300 bg-amber-50'}`}
      >
        <option value="">未分類</option>
        {SHOW_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        value={ser}
        disabled={pending}
        list="admin-series-options"
        onChange={(e) => setSer(e.target.value)}
        onBlur={() => save(cat, ser)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="系列（選填）"
        aria-label="系列"
        className="admin-input !py-1 text-xs"
      />
      <p className="h-4 text-[11px]">
        {pending && <span className="text-stone-400">儲存中…</span>}
        {state === 'saved' && <span className="text-green-600">✓ 已儲存</span>}
        {state === 'error' && <span className="text-red-600">儲存失敗，請再試一次</span>}
      </p>
    </div>
  );
}
