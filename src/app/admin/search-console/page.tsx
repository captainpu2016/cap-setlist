import DataTabs from '../data-tabs';
import { getArchive, displaySongTitle } from '@/lib/archive';
import { hasServiceAccount, isGscConfigured, listGscSites } from '@/lib/gsc';
import { loadServiceAccount } from '@/lib/google-auth';
import SearchPerformance from './search-performance';

export const dynamic = 'force-dynamic';

type Params = { range?: string; from?: string; to?: string };

function Setup({ children, searchParams }: { children: React.ReactNode; searchParams?: Params }) {
  return (
    <div className="max-w-3xl">
      <DataTabs active="search" searchParams={searchParams} />
      <p className="text-sm text-stone-500">資料來自 Google Search Console：訪客在 Google 搜尋什麼字、看到你們的網站排第幾、有沒有點進來。</p>
      <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">{children}</div>
    </div>
  );
}

export default async function AdminSearchConsolePage({ searchParams }: { searchParams: Params }) {
  // ── 設定檢查：一步一步告訴你還缺什麼 ──
  if (!hasServiceAccount()) {
    return (
      <Setup searchParams={searchParams}>
        <p className="font-bold">尚未設定 Google service account</p>
        <p className="mt-2">
          這個頁面和「訪客流量」共用同一個 service account：請先設定環境變數 <code>GA4_SERVICE_ACCOUNT_JSON</code>。
        </p>
      </Setup>
    );
  }

  const sa = loadServiceAccount();
  if (!isGscConfigured()) {
    let sites: { siteUrl: string; permissionLevel: string }[] = [];
    let siteError: string | null = null;
    try {
      sites = await listGscSites();
    } catch (e) {
      siteError = e instanceof Error ? e.message : '讀取失敗';
    }
    return (
      <Setup searchParams={searchParams}>
        <p className="font-bold">還差一個環境變數：GSC_SITE_URL</p>
        {siteError ? (
          <p className="mt-2 text-red-700">{siteError}</p>
        ) : sites.length > 0 ? (
          <>
            <p className="mt-2">
              這個 service account 目前在 Search Console 看得到下面的網站資源。把你要用的那一個（完整照抄，包含結尾的斜線或 <code>sc-domain:</code>）設成環境變數{' '}
              <code>GSC_SITE_URL</code>，再重新部署：
            </p>
            <ul className="mt-3 space-y-1.5">
              {sites.map((s) => (
                <li key={s.siteUrl} className="rounded border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-stone-800">
                  GSC_SITE_URL={s.siteUrl} <span className="ml-2 font-sans text-stone-400">（權限：{s.permissionLevel}）</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mt-2">
              這個 service account 在 Search Console 還看不到任何網站資源。請到 Search Console 的「設定 → 使用者和權限」，把下面這個 email 加進去（權限選「受限」就夠）：
            </p>
            {sa && <p className="mt-3 break-all rounded border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-stone-800">{sa.client_email}</p>}
            <p className="mt-3">另外請確認 Google Cloud 已啟用「Google Search Console API」。加完之後重新整理這一頁，會列出可用的網站資源給你複製。</p>
          </>
        )}
      </Setup>
    );
  }

  // ── 站內資料：頁面網址換成場次、歌曲名稱，並在每日圖上標出演出日 ──
  const archive = await getArchive();
  const songById = new Map(archive.songs.map((s) => [s.id, s]));
  const showBySlug = new Map(archive.shows.map((s) => [s.slug, s]));
  const labelPage = (url: string): string => {
    let path = url;
    try {
      path = new URL(url).pathname;
    } catch {
      /* 不是完整網址就直接用原字串 */
    }
    if (path === '/') return '首頁';
    const show = path.match(/^\/show\/([^/]+)/);
    if (show) return showBySlug.get(decodeURIComponent(show[1]))?.title ?? path;
    const song = path.match(/^\/song\/([^/]+)/);
    if (song) {
      const s = songById.get(decodeURIComponent(song[1]));
      return s ? '歌曲：' + displaySongTitle(s.title) : path;
    }
    return path;
  };

  return (
    <div className="max-w-5xl">
      <DataTabs active="search" searchParams={searchParams} />
      <SearchPerformance
        searchParams={searchParams}
        basePath="/admin/search-console"
        labelPage={labelPage}
        markers={archive.shows.map((s) => ({ date: s.date, title: s.title }))}
      />
    </div>
  );
}
