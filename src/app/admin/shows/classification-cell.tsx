'use client';

import { useState, useTransition } from 'react';
import { updateShowClassification } from './actions';
import { ADMISSIONS, SHOW_CATEGORIES } from '@/lib/show-category';

type State = 'idle' | 'saved' | 'error';

/** 場次列表上的分類／系列欄：改了就自動儲存（分類選了立刻存，系列輸入完離開欄位時存） */
export default function ClassificationCell({
  showId,
  category,
  series,
  admission
}: {
  showId: string;
  category: string | null;
  series: string | null;
  /** undefined 代表資料庫還沒有這個欄位（0007 尚未執行） */
  admission?: string | null;
}) {
  const [cat, setCat] = useState(category ?? '');
  const [ser, setSer] = useState(series ?? '');
  const hasAdmission = admission !== undefined;
  const [adm, setAdm] = useState(admission ?? '');
  const [saved, setSaved] = useState({ cat: category ?? '', ser: series ?? '', adm: admission ?? '' });
  const [state, setState] = useState<State>('idle');
  const [pending, startTransition] = useTransition();

  function save(nextCat: string, nextSer: string, nextAdm: string = adm) {
    if (nextCat === saved.cat && nextSer.trim() === saved.ser && nextAdm === saved.adm) return;
    setState('idle');
    startTransition(async () => {
      try {
        await updateShowClassification(showId, nextCat, nextSer, hasAdmission ? nextAdm : undefined);
        setSaved({ cat: nextCat, ser: nextSer.trim(), adm: nextAdm });
        setState('saved');
        setTimeout(() => setState('idle'), 2000);
      } catch {
        setState('error');
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={cat}
          disabled={pending}
          onChange={(e) => {
            setCat(e.target.value);
            save(e.target.value, ser);
          }}
          aria-label="演出分類"
          className={`admin-input !w-28 shrink-0 !py-1.5 text-sm ${cat ? '' : '!border-amber-300 !bg-amber-50'}`}
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
          className="admin-input min-w-0 flex-1 !py-1.5 text-sm"
        />
      </div>
      {hasAdmission && cat === 'festival' && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-stone-500">入場</span>
          <select
            value={adm}
            disabled={pending}
            onChange={(e) => {
              setAdm(e.target.value);
              save(cat, ser, e.target.value);
            }}
            aria-label="入場方式"
            className={`admin-input !w-28 shrink-0 !py-1.5 text-sm ${adm ? '' : '!border-amber-300 !bg-amber-50'}`}
          >
            <option value="">未填</option>
            {ADMISSIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="mt-1 h-4 text-[11px]">
        {pending && <span className="text-stone-400">儲存中…</span>}
        {state === 'saved' && <span className="text-green-600">✓ 已儲存</span>}
        {state === 'error' && <span className="text-red-600">儲存失敗，請再試一次</span>}
      </p>
    </div>
  );
}
