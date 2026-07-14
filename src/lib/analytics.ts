declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * 送出 GA4 自訂事件。如果訪客沒有載入 GA（例如本機開發、還沒設定 Measurement ID、
 * 或被廣告攔截套件擋掉），這裡會靜默略過，不會噴錯、不影響任何其他功能。
 */
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
}
