'use client';

import { useState, useTransition } from 'react';
import { updateShowInfo, deleteShow } from '../../actions';
import type { Show, Venue } from '@/types/database';
import { toTaipeiInputValue } from '@/lib/format';
import { ADMISSIONS, SHOW_CATEGORIES } from '@/lib/show-category';

type SaveState = 'idle' | 'saved' | 'error';

export default function ShowInfoForm({ show, venues, seriesOptions = [] }: { show: Show; venues: Venue[]; seriesOptions?: string[] }) {
  const [status, setStatus] = useState(show.status);
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>('idle');

  function handleSubmit(formData: FormData) {
    setSaveState('idle');
    startTransition(async () => {
      try {
        await updateShowInfo(formData);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2500);
      } catch {
        setSaveState('error');
      }
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2">
      <input type="hidden" name="id" value={show.id} />

      <div>
        <label className="admin-label" htmlFor="title">場次名稱</label>
        <input id="title" name="title" defaultValue={show.title} required className="admin-input" />
      </div>

      <div>
        <label className="admin-label" htmlFor="show_date">演出日期</label>
        <input id="show_date" name="show_date" type="date" defaultValue={show.show_date} required className="admin-input" />
      </div>

      <div>
        <label className="admin-label" htmlFor="venue_id">場地</label>
        <select id="venue_id" name="venue_id" defaultValue={show.venue_id ?? ''} className="admin-input">
          <option value="">未指定</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.city ? `${v.city} ${v.name}` : v.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-400">
          找不到想要的場地？<a href="/admin/venues/new" className="underline hover:text-stone-600">先去新增一個場地</a>，回來這裡重新整理就會出現在選單裡。
        </p>
      </div>

      <div>
        <label className="admin-label" htmlFor="slug">網址代稱（slug）</label>
        <input id="slug" name="slug" defaultValue={show.slug} required className="admin-input" />
      </div>

      {/* 分類與系列要等資料庫執行過 0005_show_category.sql 才存在 */}
      {'category' in show && (
        <>
          <div>
            <label className="admin-label" htmlFor="category">演出分類</label>
            <select id="category" name="category" defaultValue={show.category ?? ''} className="admin-input">
              <option value="">未分類</option>
              {SHOW_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-400">一場演出只選一種。前台全部場次可依分類篩選，歌單統計也會依分類比較。</p>
          </div>
          <div>
            <label className="admin-label" htmlFor="series">系列（選填）</label>
            <input
              id="series"
              name="series"
              list="series-options"
              defaultValue={show.series ?? ''}
              className="admin-input"
              placeholder="例如 Tiny Me, BIG Dream Tour"
            />
            <datalist id="series-options">
              {seriesOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-stone-400">同一條巡迴或每年舉辦的活動填一樣的名稱，前台就能把它們歸在一起。從下拉選已有的名稱，避免打錯字。</p>
          </div>
        </>
      )}

      {'admission' in show && (
        <div>
          <label className="admin-label" htmlFor="admission">入場方式（選填）</label>
          <select id="admission" name="admission" defaultValue={show.admission ?? ''} className="admin-input">
            <option value="">未填</option>
            {ADMISSIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-400">主要給音樂祭/節用：前台選「音樂祭/節」時可以再分付費或免費。</p>
        </div>
      )}

      {/* 這兩個欄位要等資料庫執行過 0003_show_ticket_time.sql 才存在；還沒執行就不顯示，避免儲存失敗 */}
      {'ticket_url' in show && (
        <>
          <div>
            <label className="admin-label" htmlFor="start_time">開演時間（選填，台灣時間）</label>
            <input
              id="start_time"
              name="start_time"
              type="time"
              defaultValue={show.start_time?.slice(0, 5) ?? ''}
              className="admin-input"
            />
            <p className="mt-1 text-xs text-stone-400">
              填了之後，前台會顯示開演時間與倒數，行事曆也會是有時間的活動；留空則是全天事件。
            </p>
          </div>
          <div>
            <label className="admin-label" htmlFor="ticket_url">售票連結（選填）</label>
            <input
              id="ticket_url"
              name="ticket_url"
              type="url"
              defaultValue={show.ticket_url ?? ''}
              className="admin-input"
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-stone-400">只在演出開始前顯示「購票」按鈕，演出結束後自動隱藏。</p>
          </div>
        </>
      )}

      <div className="sm:col-span-2">
        <label className="admin-label" htmlFor="cover_image_url">封面圖片網址（選填）</label>
        <input
          id="cover_image_url"
          name="cover_image_url"
          defaultValue={show.cover_image_url ?? ''}
          className="admin-input"
          placeholder="https://xxxxxxxxxxxx.supabase.co/storage/v1/object/public/..."
        />
        <p className="mt-1 text-xs text-stone-400">
          先到 Supabase Dashboard 左側「Storage」上傳這場演出的照片，複製公開網址貼在這裡。留空則不顯示。
        </p>
        {show.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={show.cover_image_url}
            alt="目前的封面圖片預覽"
            className="mt-3 h-32 w-full rounded-md border border-stone-200 object-cover"
          />
        )}
      </div>

      <div className="sm:col-span-2">
        <label className="admin-label" htmlFor="setlist_reveal_at">歌單公開時間（選填）</label>
        <input
          id="setlist_reveal_at"
          name="setlist_reveal_at"
          type="datetime-local"
          defaultValue={toTaipeiInputValue(show.setlist_reveal_at)}
          className="admin-input"
        />
        <p className="mt-1 text-xs text-stone-400">
          留空＝場次一上架，歌單就會立刻顯示。設定時間的話，場次頁在那之前會先顯示「敬請期待」，
          不會提前曝光歌單內容（例如避免下一場的曲目被提前看到）。
        </p>
      </div>

      <div className="sm:col-span-2">
        <span className="admin-label">上架狀態</span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="radio"
              name="status"
              value="draft"
              checked={status === 'draft'}
              onChange={() => setStatus('draft')}
            />
            草稿（前台不可見）
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="radio"
              name="status"
              value="published"
              checked={status === 'published'}
              onChange={() => setStatus('published')}
            />
            已上架
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={isPending} className="admin-btn">
          {isPending ? '儲存中…' : '儲存場次資料'}
        </button>

        {saveState === 'saved' && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <span aria-hidden>✓</span> 已儲存
          </span>
        )}
        {saveState === 'error' && (
          <span className="text-sm text-red-600">儲存失敗，請再試一次</span>
        )}

        <button
          type="submit"
          formAction={deleteShow}
          className="admin-btn-danger ml-auto"
          onClick={(e) => {
            if (!confirm('確定要刪除這個場次嗎？歌單資料也會一併刪除，此動作無法復原。')) e.preventDefault();
          }}
        >
          刪除場次
        </button>
      </div>
    </form>
  );
}
