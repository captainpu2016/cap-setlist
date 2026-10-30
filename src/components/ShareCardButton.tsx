'use client';

import { useRef, useState } from 'react';

export default function ShareCardButton({ slug, title }: { slug: string; title: string }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 滑鼠移上去／手指按下時就先開始產生圖片，等真的點下去時通常已經好了
  const pending = useRef<Promise<Blob> | null>(null);

  function fetchCard(): Promise<Blob> {
    if (!pending.current) {
      pending.current = fetch(`/show/${slug}/card`)
        .then((res) => {
          if (!res.ok) throw new Error('產生圖片失敗');
          return res.blob();
        })
        .catch((err) => {
          // 失敗就清掉，下次點擊才會重試
          pending.current = null;
          throw err;
        });
    }
    return pending.current;
  }

  async function handleClick() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const blob = await fetchCard();
      const file = new File([blob], `${title}-setlist.png`, { type: 'image/png' });

      let shared = false;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${title} 歌單` });
          shared = true;
        } catch (shareErr) {
          // 使用者自己把系統分享視窗取消掉，不算錯誤，也不用再跳出下載
          if (shareErr instanceof Error && shareErr.name === 'AbortError') {
            shared = true;
          }
          // 其他分享失敗的原因（常見於桌機瀏覽器對檔案分享支援不完整），
          // 不當作硬性錯誤，往下走下載備援即可
        }
      }

      if (!shared) {
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
        onPointerEnter={() => void fetchCard().catch(() => {})}
        onFocus={() => void fetchCard().catch(() => {})}
        disabled={loading}
        className="btn-ghost"
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
