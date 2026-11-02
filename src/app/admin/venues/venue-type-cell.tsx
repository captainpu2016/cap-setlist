'use client';

import { useState, useTransition } from 'react';
import { updateVenueType } from './actions';
import { VENUE_TYPES } from '@/lib/venue-type';

/** 場地列表上直接改場地類型，選了就自動儲存 */
export default function VenueTypeCell({ venueId, venueType }: { venueId: string; venueType: string | null }) {
  const [value, setValue] = useState(venueType ?? '');
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    setValue(next);
    setState('idle');
    startTransition(async () => {
      try {
        await updateVenueType(venueId, next);
        setState('saved');
        setTimeout(() => setState('idle'), 2000);
      } catch {
        setState('error');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        aria-label="場地類型"
        className={`admin-input !w-32 !py-1.5 text-sm ${value ? '' : '!border-amber-300 !bg-amber-50'}`}
      >
        <option value="">未分類</option>
        {VENUE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <span className="w-14 text-[11px]">
        {pending && <span className="text-stone-400">儲存中…</span>}
        {!pending && state === 'saved' && <span className="text-green-600">✓ 已儲存</span>}
        {!pending && state === 'error' && <span className="text-red-600">失敗</span>}
      </span>
    </div>
  );
}
