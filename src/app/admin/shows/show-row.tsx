'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { updateShowClassification } from './actions';
import { formatShowDateShort } from '@/lib/format';
import { isOverseasVenue } from '@/lib/geo';
import { ADMISSIONS, SHOW_CATEGORIES } from '@/lib/show-category';

type State = 'idle' | 'saved' | 'error';

export interface ShowRowData {
  id: string;
  title: string;
  show_date: string;
  venue: string | null;
  status: 'draft' | 'published';
  hasPlaylist: boolean;
  category: string | null;
  series: string | null;
  /** undefined 代表資料庫還沒有這個欄位（0007 尚未執行） */
  admission?: string | null;
}

/** 場次管理的一列：分類、系列、入場方式直接在列上改，改了自動儲存 */
export default function ShowRow({
  show,
  hasClassification,
  hasAdmission
}: {
  show: ShowRowData;
  hasClassification: boolean;
  hasAdmission: boolean;
}) {
  const [cat, setCat] = useState(show.category ?? '');
  const [ser, setSer] = useState(show.series ?? '');
  const [adm, setAdm] = useState(show.admission ?? '');
  const [saved, setSaved] = useState({ cat: show.category ?? '', ser: show.series ?? '', adm: show.admission ?? '' });
  const [state, setState] = useState<State>('idle');
  const [pending, startTransition] = useTransition();

  function save(nextCat: string, nextSer: string, nextAdm: string) {
    if (nextCat === saved.cat && nextSer.trim() === saved.ser && nextAdm === saved.adm) return;
    setState('idle');
    startTransition(async () => {
      try {
        await updateShowClassification(show.id, nextCat, nextSer, hasAdmission ? nextAdm : undefined);
        setSaved({ cat: nextCat, ser: nextSer.trim(), adm: nextAdm });
        setState('saved');
        setTimeout(() => setState('idle'), 2000);
      } catch {
        setState('error');
      }
    });
  }

  const overseas = isOverseasVenue(show.venue);

  return (
    <tr className="hover:bg-stone-50/60">
      <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatShowDateShort(show.show_date)}</td>
      <td className="px-4 py-3">
        <Link href={`/admin/shows/${show.id}/setlist`} className="font-medium leading-snug text-stone-900 hover:underline">
          {show.title}
        </Link>
        {show.venue && (
          <p className="mt-0.5 text-xs text-stone-400">
            {show.venue}
            {overseas && <span className="ml-1.5 rounded bg-sky-50 px-1.5 py-px text-[10px] text-sky-700">海外</span>}
          </p>
        )}
      </td>
      {hasClassification && (
        <>
          <td className="px-2 py-3">
            <select
              value={cat}
              disabled={pending}
              onChange={(e) => {
                setCat(e.target.value);
                save(e.target.value, ser, adm);
              }}
              aria-label="演出分類"
              className={`admin-input !py-1.5 text-sm ${cat ? '' : '!border-amber-300 !bg-amber-50'}`}
            >
              <option value="">未分類</option>
              {SHOW_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </td>
          <td className="px-2 py-3">
            <input
              value={ser}
              disabled={pending}
              list="admin-series-options"
              onChange={(e) => setSer(e.target.value)}
              onBlur={() => save(cat, ser, adm)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="系列（選填）"
              aria-label="系列"
              className="admin-input !py-1.5 text-sm"
            />
          </td>
          {hasAdmission && (
            <td className="px-2 py-3">
              {cat === 'festival' ? (
                <select
                  value={adm}
                  disabled={pending}
                  onChange={(e) => {
                    setAdm(e.target.value);
                    save(cat, ser, e.target.value);
                  }}
                  aria-label="入場方式"
                  className={`admin-input !py-1.5 text-sm ${adm ? '' : '!border-amber-300 !bg-amber-50'}`}
                >
                  <option value="">入場?</option>
                  {ADMISSIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="px-2 text-stone-300">—</span>
              )}
            </td>
          )}
        </>
      )}
      <td className="whitespace-nowrap px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            show.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
          }`}
        >
          {show.status === 'published' ? '已上架' : '草稿'}
        </span>
        <p className="mt-1 h-4 text-[11px]">
          {pending && <span className="text-stone-400">儲存中…</span>}
          {!pending && state === 'saved' && <span className="text-green-600">✓ 已儲存</span>}
          {!pending && state === 'error' && <span className="text-red-600">儲存失敗</span>}
          {!pending && state === 'idle' && show.hasPlaylist && <span className="text-stone-400">有播放清單</span>}
        </p>
      </td>
    </tr>
  );
}
