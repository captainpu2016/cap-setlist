import Link from 'next/link';
import { getArchive, displaySongTitle } from '@/lib/archive';
import { todayTaipei } from '@/lib/format';
import { hasServiceAccount, isGscConfigured, listGscSites, querySearchAnalytics, type GscRow } from '@/lib/gsc';
import { loadServiceAccount } from '@/lib/google-auth';
import AreaChart from '../analytics/area-chart';
import { BarList, Card, StatCard, type BarRow } from '../analytics/charts';

export const dynamic = 'force-dynamic';

const RANGES = [
  { key: '7', label: '近 7 天', days: 7 },
  { key: '28', label: '近 28 天', days: 28 },
  { key: '90', label: '近 90 天', days: 90 }
];

// Search Console 的資料大約晚 2–3 天才會出來：預設的區間結束在兩天前
const LAG_DAYS = 2;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

const COUNTRY_NAMES: Record<string, string> = {
  twn: '台灣', jpn: '日本', hkg: '香港', mac: '澳門', kor: '韓國', usa: '美國', sgp: '新加坡', mys: '馬來西亞', chn: '中國',
  gbr: '英國', can: '加拿大', aus: '澳洲', deu: '德國', fra: '法國', tha: '泰國', vnm: '越南', idn: '印尼', phl: '菲律賓'
};
const DEVICE_NAMES: Record<string, string> = { MOBILE: '手機', DESKTOP: '電腦', TABLET: '平板' };

const nf = new Intl.NumberFormat('zh-TW');
const pct = (v: number) => (v * 100).toFixed(1) + '%';

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()) / 86_400_000) + 1;
}

function Setup({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-stone-900">搜尋表現</h1>
      <p className="mt-1 text-sm text-stone-500">資料來自 Google Search Console：訪客在 Google 搜尋什麼字、看到你們的網站排第幾、有沒有點進來。</p>
      <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">{children}</div>
    </div>
  );
}

function ResultTable({ rows, label, labelOf }: { rows: GscRow[]; label: string; labelOf: (key: string) => string }) {
  if (rows.length === 0) return <p className="text-sm text-stone-400">這段期間還沒有資料。</p>;
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs text-stone-400">
          <tr>
            <th className="px-2 py-2 font-normal">{label}</th>
            <th className="px-2 py-2 text-right font-normal">點擊</th>
            <th className="px-2 py-2 text-right font-normal">曝光</th>
            <th className="px-2 py-2 text-right font-normal">點擊率</th>
            <th className="px-2 py-2 text-right font-normal">排名</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 tabular-nums">
          {rows.map((r) => (
            <tr key={r.keys[0]}>
              <td className="max-w-[20rem] truncate px-2 py-2.5 text-stone-800" title={r.keys[0]}>
                {labelOf(r.keys[0])}
              </td>
              <td className="px-2 py-2.5 text-right font-medium text-stone-900">{nf.format(r.clicks)}</td>
              <td className="px-2 py-2.5 text-right text-stone-600">{nf.format(r.impressions)}</td>
              <td className="px-2 py-2.5 text-right text-stone-600">{pct(r.ctr)}</td>
              <td className="px-2 py-2.5 text-right text-stone-600">{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminSearchConsolePage({ searchParams }: { searchParams: { range?: string; from?: string; to?: string } }) {
  // ── 設定檢查：一步一步告訴你還缺什麼 ──
  if (!hasServiceAccount()) {
    return (
      <Setup>
        <p className="font-bold">尚未設定 Google service account</p>
        <p className="mt-2">
          這個頁面和「網站數據」共用同一個 service account：請先設定環境變數 <code>GA4_SERVICE_ACCOUNT_JSON</code>。
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
      <Setup>
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

  // ── 日期區間（台灣時間）：預設區間結束在兩天前；自訂區間可到今天，但最近兩三天可能還沒有資料 ──
  const range = RANGES.find((r) => r.key === searchParams.range) ?? RANGES[1];
  const today = todayTaipei();
  const latest = addDays(today, -LAG_DAYS);
  let custom: { from: string; to: string } | null = null;
  let rangeNote: string | null = null;
  if (searchParams.from || searchParams.to) {
    const { from: f, to: t2 } = searchParams;
    if (!f || !t2 || !ISO_DATE.test(f) || !ISO_DATE.test(t2)) rangeNote = '請同時選好起始日與結束日。';
    else if (f > t2) rangeNote = '起始日不能晚於結束日。';
    else if (t2 > today) rangeNote = '結束日不能晚於今天。';
    else if (daysBetween(f, t2) > MAX_RANGE_DAYS) rangeNote = '一次最多查詢 ' + MAX_RANGE_DAYS + ' 天。';
    else custom = { from: f, to: t2 };
  }
  const to = custom ? custom.to : latest;
  const from = custom ? custom.from : addDays(latest, -(range.days - 1));
  const dayCount = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(dayCount - 1));

  let error: string | null = null;
  let total: GscRow | undefined;
  let prevTotal: GscRow | undefined;
  let daily: GscRow[] = [];
  let queries: GscRow[] = [];
  let pages: GscRow[] = [];
  let countries: GscRow[] = [];
  let devices: GscRow[] = [];
  try {
    [[total], [prevTotal], daily, queries, pages, countries, devices] = await Promise.all([
      querySearchAnalytics({ startDate: from, endDate: to }),
      querySearchAnalytics({ startDate: prevFrom, endDate: prevTo }),
      querySearchAnalytics({ startDate: from, endDate: to, dimensions: ['date'], rowLimit: 500 }),
      querySearchAnalytics({ startDate: from, endDate: to, dimensions: ['query'], rowLimit: 20 }),
      querySearchAnalytics({ startDate: from, endDate: to, dimensions: ['page'], rowLimit: 20 }),
      querySearchAnalytics({ startDate: from, endDate: to, dimensions: ['country'], rowLimit: 10 }),
      querySearchAnalytics({ startDate: from, endDate: to, dimensions: ['device'], rowLimit: 5 })
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : '讀取 Search Console 失敗';
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

  const byDate = new Map(daily.map((r) => [r.keys[0], r]));
  const dailyClicks = Array.from({ length: dayCount }, (_, i) => {
    const iso = addDays(from, i);
    const d = new Date(iso + 'T00:00:00Z');
    const row = byDate.get(iso);
    return { date: iso, label: d.getUTCMonth() + 1 + '/' + d.getUTCDate(), users: 0, views: row?.clicks ?? 0 };
  });
  const dailyImpressions = dailyClicks.map((d) => ({ ...d, views: byDate.get(d.date)?.impressions ?? 0 }));
  const showMarkers = archive.shows.filter((s) => s.date >= from && s.date <= to).map((s) => ({ date: s.date, title: s.title }));

  const cur = (key: 'clicks' | 'impressions' | 'ctr' | 'position') => (total ? total[key] : 0);
  const prev = (key: 'clicks' | 'impressions' | 'ctr' | 'position') => (prevTotal ? prevTotal[key] : 0);

  const countryBars: BarRow[] = countries.map((r) => ({
    name: COUNTRY_NAMES[r.keys[0]] ?? r.keys[0].toUpperCase(),
    value: r.clicks,
    sub: nf.format(r.impressions) + ' 次曝光'
  }));
  const deviceBars: BarRow[] = devices.map((r) => ({
    name: DEVICE_NAMES[r.keys[0]] ?? r.keys[0],
    value: r.clicks,
    sub: nf.format(r.impressions) + ' 次曝光'
  }));

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900">搜尋表現</h1>
          <p className="mt-1 text-sm text-stone-500">
            資料來自 Google Search Console：訪客在 Google 搜尋什麼字、看到你們排第幾、有沒有點進來。資料約晚 2–3 天才會出來，最近幾天可能是空的。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-stone-200 bg-white p-1 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={'/admin/search-console?range=' + r.key}
              className={'rounded px-3 py-1 ' + (!custom && r.key === range.key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <form
        method="get"
        action="/admin/search-console"
        className={'mt-3 flex flex-wrap items-end gap-3 rounded-md border bg-white p-3 text-sm ' + (custom ? 'border-stone-900' : 'border-stone-200')}
      >
        <label className="block">
          <span className="mb-1 block text-xs text-stone-500">自訂起始日</span>
          <input type="date" name="from" defaultValue={custom?.from ?? from} max={today} required className="admin-input !w-40 !py-1.5" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-stone-500">結束日</span>
          <input type="date" name="to" defaultValue={custom?.to ?? to} max={today} required className="admin-input !w-40 !py-1.5" />
        </label>
        <button type="submit" className="admin-btn !py-1.5">
          套用
        </button>
        <p className="pb-1.5 text-xs text-stone-400">
          {from.replace(/-/g, '/')} – {to.replace(/-/g, '/')}（共 {dayCount} 天），對照前一段 {prevFrom.replace(/-/g, '/')} – {prevTo.replace(/-/g, '/')}
        </p>
        {rangeNote && (
          <p className="w-full text-xs text-red-600">
            {rangeNote}已改回近 {range.days} 天。
          </p>
        )}
      </form>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700">{error}</p>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="曝光次數" value={nf.format(cur('impressions'))} cur={cur('impressions')} prev={prev('impressions')} />
            <StatCard label="點擊次數" value={nf.format(cur('clicks'))} cur={cur('clicks')} prev={prev('clicks')} />
            <StatCard label="點擊率" value={pct(cur('ctr'))} cur={cur('ctr')} prev={prev('ctr')} />
            <StatCard
              label="平均排名"
              value={cur('position') ? cur('position').toFixed(1) : '—'}
              cur={cur('position')}
              prev={prev('position')}
              hint="較前一期（愈小愈前面）"
              invert
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="每日曝光" note="你們的網站出現在 Google 搜尋結果的次數。虛線是演出日。">
              <AreaChart data={dailyImpressions} markers={showMarkers} viewsLabel="曝光" hideUsers />
            </Card>
            <Card title="每日點擊" note="有人從搜尋結果點進來的次數。">
              <AreaChart data={dailyClicks} markers={showMarkers} viewsLabel="點擊" hideUsers />
            </Card>
          </div>

          <Card title="訪客搜了什麼字" note="依點擊次數排序，前 20 個搜尋字。排名是這個字在搜尋結果的平均名次（1 是第一個）。">
            <ResultTable rows={queries} label="搜尋字" labelOf={(k) => k} />
          </Card>

          <Card title="哪些頁面被搜尋找到" note="依點擊次數排序，前 20 個頁面；場次與歌曲頁顯示名稱。">
            <ResultTable rows={pages} label="頁面" labelOf={labelPage} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="搜尋流量來自哪些國家" note="依點擊次數。">
              <BarList rows={countryBars} unit="次點擊" />
            </Card>
            <Card title="用什麼裝置搜尋" note="依點擊次數。">
              <BarList rows={deviceBars} unit="次點擊" />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
