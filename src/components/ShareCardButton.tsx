'use client';

import { useState } from 'react';

export default function ShareCardButton({ slug, title }: { slug: string; title: string }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/show/${slug}/card`);
      if (!res.ok) throw new Error('產生圖片失敗');
      const blob = await res.blob();
      const file = new File([blob], `${title}-setlist.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${title} 歌單` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}-setlist.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[share-card]', err);
      setErrorMessage('產生圖片失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-stage-700 px-4 py-2 text-sm text-stone-300 transition hover:border-marquee hover:text-marquee disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ImageIcon /> {loading ? '產生中…' : '分享歌單卡片'}
      </button>
      {errorMessage && <p className="mt-2 text-xs text-signal">{errorMessage}</p>}
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
