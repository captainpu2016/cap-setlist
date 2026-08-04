const STORAGE_KEY = 'ncap_device_id';

/**
 * 取得（或第一次建立）這個瀏覽器專屬的裝置 ID，存在 localStorage。
 * 不是帳號系統，純粹用來讓「我有參與」這個功能可以概略去重，
 * 換瀏覽器、清 localStorage、換裝置都會被當成新的一位，這是刻意接受的限制，
 * 這個功能本質上是輕量的社群互動小工具，不是嚴謹的驗證機制。
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
