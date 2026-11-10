import { runReport } from '@/lib/ga4';

/** 網址路徑統一成查表用的格式：去掉參數與結尾斜線，首頁就是 "/" */
export function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0];
  return clean.length > 1 ? clean.replace(/\/+$/, '') || '/' : clean || '/';
}

/**
 * 從 GA4 抓某個網站「網頁路徑 → 頁面標題」的對照（近一年、瀏覽量前 300 個頁面）。
 * 數據頁的路徑欄位用這個補上人看得懂的標題；抓不到就回傳空表，畫面照常顯示路徑。
 * 同一個路徑有多個標題時，取瀏覽量最高的那個。
 */
export async function fetchPageTitles(propertyId: string): Promise<Map<string, string>> {
  const best = new Map<string, { title: string; views: number }>();
  try {
    const rows = await runReport({
      propertyId,
      startDate: '365daysAgo',
      endDate: 'today',
      dimensions: ['pagePath', 'pageTitle'],
      metrics: ['screenPageViews'],
      orderBy: { metric: 'screenPageViews' },
      limit: 300
    });
    for (const r of rows) {
      const title = r.dims[1];
      if (!title || title === '(not set)') continue;
      const path = normalizePath(r.dims[0]);
      const cur = best.get(path);
      if (!cur || r.metrics[0] > cur.views) best.set(path, { title, views: r.metrics[0] });
    }
  } catch {
    /* 沒有標題就顯示路徑 */
  }
  return new Map(Array.from(best.entries()).map(([k, v]) => [k, v.title]));
}
