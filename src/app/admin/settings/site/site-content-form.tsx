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
