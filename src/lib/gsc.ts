import { getAccessToken, loadServiceAccount } from '@/lib/google-auth';

/**
 * Google Search Console API（只在伺服器端使用）。和 GA4 共用同一個 service account，
 * 但這個 service account 的 email 還要被加進 Search Console 該網站資源的使用者裡，才讀得到資料。
 */

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const API = 'https://www.googleapis.com/webmasters/v3';

export function isGscConfigured(): boolean {
  return Boolean(process.env.GSC_SITE_URL && loadServiceAccount());
}

export function hasServiceAccount(): boolean {
  return Boolean(loadServiceAccount());
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number; // 0–1
  position: number;
}

async function authHeader() {
  const sa = loadServiceAccount();
  if (!sa) throw new Error('尚未設定 Google service account');
  return { Authorization: `Bearer ${await getAccessToken(sa, SCOPE)}` };
}

async function failure(res: Response): Promise<Error> {
  const text = await res.text();
  if (res.status === 403) {
    return new Error(
      'Search Console 拒絕存取（403）：請確認 ① 已在 Google Cloud 啟用「Google Search Console API」，② service account 的 email 已加進 Search Console 該網站的「使用者和權限」，③ GSC_SITE_URL 與 Search Console 裡的資源完全一致。'
    );
  }
  return new Error(`Search Console API 錯誤（${res.status}）：${text.slice(0, 240)}`);
}

/** 這個 service account 在 Search Console 看得到哪些網站資源（設定診斷用） */
export async function listGscSites(): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  const res = await fetch(`${API}/sites`, { headers: await authHeader(), cache: 'no-store' });
  if (!res.ok) throw await failure(res);
  const json = (await res.json()) as { siteEntry?: { siteUrl: string; permissionLevel: string }[] };
  return json.siteEntry ?? [];
}

interface QueryOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dimensions?: ('date' | 'query' | 'page' | 'country' | 'device')[];
  rowLimit?: number;
}

/** searchAnalytics.query：dimensions 空陣列時回傳整個期間的總計（一列） */
export async function querySearchAnalytics(opts: QueryOptions): Promise<GscRow[]> {
  const site = process.env.GSC_SITE_URL;
  if (!site) throw new Error('尚未設定 GSC_SITE_URL');
  const res = await fetch(`${API}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions ?? [],
      rowLimit: opts.rowLimit ?? 25,
      dataState: 'final'
    }),
    // 搜尋資料本來就有延遲，快取一小時省配額
    next: { revalidate: 3600 }
  });
  if (!res.ok) throw await failure(res);
  const json = (await res.json()) as { rows?: GscRow[] };
  return (json.rows ?? []).map((r) => ({ ...r, keys: r.keys ?? [] }));
}
