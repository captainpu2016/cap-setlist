'use client';

import { useState, useTransition } from 'react';
import { updateSiteContent } from './actions';
import type { SiteContent } from '@/lib/site-settings';

type SaveState = 'idle' | 'saved' | 'error';

export default function SiteContentForm({ content }: { content: SiteContent }) {
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>('idle');

  function handleSubmit(formData: FormData) {
    setSaveState('idle');
    startTransition(async () => {
      try {
        await updateSiteContent(formData);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2500);
      } catch {
        setSaveState('error');
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-xl space-y-5">
      <div>
        <label className="admin-label" htmlFor="eyebrow">小標題（首頁 Logo 上方的英文字）</label>
        <input id="eyebrow" name="eyebrow" defaultValue={content.eyebrow} className="admin-input" />
      </div>

      <div>
        <label className="admin-label" htmlFor="tagline">首頁簡介文字</label>
        <textarea
          id="tagline"
          name="tagline"
          defaultValue={content.tagline}
          rows={3}
          className="admin-input"
        />
      </div>

      <div>
        <label className="admin-label" htmlFor="bg_image_url">首頁背景圖片網址（選填）</label>
        <input
          id="bg_image_url"
          name="bg_image_url"
          defaultValue={content.bgImageUrl ?? ''}
          className="admin-input"
          placeholder="https://xxxxxxxxxxxx.supabase.co/storage/v1/object/public/..."
        />
        <p className="mt-1 text-xs text-stone-400">
          先到 Supabase Dashboard 左側「Storage」上傳照片，複製它給你的公開網址貼在這裡。留空則不顯示背景圖。
        </p>
        {content.bgImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.bgImageUrl}
            alt="目前的背景圖片預覽"
            className="mt-3 h-32 w-full rounded-md border border-stone-200 object-cover"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="admin-btn">
          {isPending ? '儲存中…' : '儲存文案'}
        </button>
        {saveState === 'saved' && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <span aria-hidden>✓</span> 已儲存
          </span>
        )}
        {saveState === 'error' && <span className="text-sm text-red-600">儲存失敗，請再試一次</span>}
      </div>
    </form>
  );
}
