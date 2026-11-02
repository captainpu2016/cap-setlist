'use client';

import { useTransition } from 'react';
import { VENUE_TYPES } from '@/lib/venue-type';
import { upsertVenue, deleteVenue } from './actions';
import type { Venue } from '@/types/database';

export default function VenueForm({ venue }: { venue?: Venue }) {
  const isNew = !venue;
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      upsertVenue(formData);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-md space-y-5">
      <input type="hidden" name="id" value={venue?.id ?? 'new'} />

      <div>
        <label className="admin-label" htmlFor="name">場地名稱 *</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={venue?.name}
          className="admin-input"
          placeholder="例：LIVE WAREHOUSE 小庫"
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="city">城市</label>
        <input id="city" name="city" defaultValue={venue?.city ?? ''} className="admin-input" placeholder="例：高雄" />
      </div>

      {/* 要等資料庫執行過 0009_venue_type.sql 才有這個欄位；還沒執行就不顯示，避免儲存失敗 */}
      {venue && 'venue_type' in venue && (
        <div>
          <label className="admin-label" htmlFor="venue_type">場地類型</label>
          <select id="venue_type" name="venue_type" defaultValue={venue.venue_type ?? ''} className="admin-input">
            <option value="">未分類</option>
            {VENUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-400">「巡演足跡」會統計去過幾間 Live house；球場、廣場、校園、旅館等歸「其他場地」。</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="admin-label" htmlFor="latitude">緯度</label>
          <input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            defaultValue={venue?.latitude ?? ''}
            className="admin-input"
            placeholder="例：22.6273"
          />
        </div>
        <div>
          <label className="admin-label" htmlFor="longitude">經度</label>
          <input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            defaultValue={venue?.longitude ?? ''}
            className="admin-input"
            placeholder="例：120.3014"
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-stone-400">
        經緯度選填。留空的話，「巡演足跡」地圖會依城市名稱自動抓一個大概位置；填了會用這裡的精確座標。
      </p>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className="admin-btn">
          {isPending ? '儲存中…' : isNew ? '新增場地' : '儲存變更'}
        </button>
        <a href="/admin/venues" className="admin-btn-secondary">取消</a>
      </div>

      {!isNew && (
        <div className="border-t border-stone-200 pt-5">
          <p className="mb-2 text-xs text-stone-500">
            刪除場地不會刪除場次，原本使用這個場地的場次會變回「未指定場地」。
          </p>
          <button
            type="submit"
            formAction={deleteVenue}
            className="admin-btn-danger"
            onClick={(e) => {
              if (!confirm('確定要刪除這個場地嗎？')) e.preventDefault();
            }}
          >
            刪除這個場地
          </button>
        </div>
      )}
    </form>
  );
}
