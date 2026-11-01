'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

const AREA_LABEL = { header: '頂部選單', footer: '頁尾', bottom_nav: '手機底部選單', content: '頁面內容' } as const;

const PAGE_TYPE: [RegExp, string][] = [
  [/^\/$/, '首頁'],
  [/^\/shows\/?$/, '全部場次'],
  [/^\/show\/[^/]+\/?$/, '場次頁'],
  [/^\/song\/[^/]+\/?$/, '歌曲頁'],
  [/^\/tour\/?$/, '巡演足跡'],
  [/^\/stats\/?$/, '歌單統計'],
  [/^\/search\/?$/, '搜尋'],
  [/^\/me\/?$/, '我的紀錄'],
  [/^\/about\/?$/, '關於本站']
];

function pageType(path: string): string {
  for (const [re, label] of PAGE_TYPE) if (re.test(path)) return label;
  return path.split('?')[0];
}

/**
 * 全站站內連結點擊追蹤（事件委派，不用逐一改元件）。
 * 選單、頁尾用連結文字當名稱（數量固定）；內容區只記「點去哪一種頁面」，避免場次或歌名讓項目暴增。
 */
export default function ClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.('a');
      const href = a?.getAttribute('href');
      if (!a || !href) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // 站外連結由 GA 內建的外連點擊處理

      const area = a.closest('header') ? 'header' : a.closest('footer') ? 'footer' : a.closest('nav') ? 'bottom_nav' : 'content';
      const text = (a.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 20);
      const target = area === 'content' ? `→ ${pageType(url.pathname)}` : text || pageType(url.pathname);
      trackEvent('internal_click', { item: `${AREA_LABEL[area]}：${target}` });
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
