import { querySearchAnalytics, type GscRow } from '@/lib/gsc';
import { addDays, resolveRange, type RangePreset } from '@/lib/date-range';
import AreaChart from '../analytics/area-chart';
import { BarList, Card, StatCard, type BarRow } from '../analytics/charts';
import RangeControls from '../range-controls';

export const SEARCH_PRESETS: RangePreset[] = [
  { key: '7', label: '近 7 天', days: 7 },
  { key: '28', label: '近 28 天', days: 28 },
  { key: '90', label: '近 90 天', days: 90 }
];

// Search Console 的資料大約晚 2–3 天才會出來：預設的區間結束在兩天前
const LAG_DAYS = 2;

const COUNTRY_NAMES: Record<string, string> = {
  twn: '台灣', jpn: '日本', hkg: '香港', mac: '澳門', kor: '韓國', usa: '美國', sgp: '新加坡', mys: '馬來西亞', chn: '中國',
  gbr: '英國', can: '加拿大', aus: '澳洲', deu: '德國', fra: '法國', tha: '泰國', vnm: '越南', idn: '印尼', phl: '菲律賓'
};
const DEVICE_NAMES: Record<string, string> = { MOBILE: '手機', DESKTOP: '電腦', TABLET: '平板' };

const nf = new Intl.NumberFormat('zh-TW');
const pct = (v: number) => (v * 100).toFixed(1) + '%';

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

/**
 * Search Console 的搜尋表現報表（本站與日文官網共用）。
 * siteUrl 不給就用本站（環境變數 GSC_SITE_URL）；labelPage 可以把頁面網址換成好讀的名稱；markers 是要標在圖上的演出日。
 */
export default async function SearchPerformance({
  siteUrl,
  searchParams,
  basePath,
  extra,
  labelPage = (url: string) => {
    try {
      const u = new URL(url);
      return u.pathname === '/' ? '首頁' : u.pathname;
    } catch {
      return url;
    }
  },
  markers = []
}: {
  siteUrl?: string;
  searchParams: { range?: string; from?: string; to?: string };
  basePath: string;
  extra?: Record<string, string>;
  labelPage?: (url: string) => string;
  markers?: { date: string; title: string }[];
}) {
  const range = resolveRange(searchParams, SEARCH_PRESETS, '28', LAG_DAYS);
  const { from, to, dayCount, prevFrom, prevTo } = range;

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
      querySearchAnalytics({ siteUrl, startDate: from, endDate: to }),
      querySearchAnalytics({ siteUrl, startDate: prevFrom, endDate: prevTo }),
      querySearchAnalytics({ siteUrl, startDate: from, endDate: to, dimensions: ['date'], rowLimit: 500 }),
      querySearchAnalytics({ siteUrl, startDate: from, endDate: to, dimensions: ['query'], rowLimit: 20 }),
      querySearchAnalytics({ siteUrl, startDate: from, endDate: to, dimensions: ['page'], rowLimit: 20 }),
      querySearchAnalytics({ siteUrl, startDate: from, endDate: to, dimensions: ['country'], rowLimit: 10 }),
      querySearchAnalytics({ siteUrl, startDate: from, endDate: to, dimensions: ['device'], rowLimit: 5 })
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : '讀取 Search Console 失敗';
  }

  const byDate = new Map(daily.map((r) => [r.keys[0], r]));
  const dailyClicks = Array.from({ length: dayCount }, (_, i) => {
    const iso = addDays(from, i);
    const d = new Date(iso + 'T00:00:00Z');
    const row = byDate.get(iso);
    return { date: iso, label: d.getUTCMonth() + 1 + '/' + d.getUTCDate(), users: 0, views: row?.clicks ?? 0 };
  });
  const dailyImpressions = dailyClicks.map((d) => ({ ...d, views: byDate.get(d.date)?.impressions ?? 0 }));
  const dayMarkers = markers.filter((m) => m.date >= from && m.date <= to);

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
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-stone-500">
          資料來自 Google Search Console：訪客在 Google 搜尋什麼字、看到網站排第幾、有沒有點進來。資料約晚 2–3 天才會出來，最近幾天可能是空的。
        </p>
      </div>
      <div className="mt-3">
        <RangeControls presets={SEARCH_PRESETS} range={range} basePath={basePath} extra={extra} />
      </div>

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
            <Card title="每日曝光" note={'出現在 Google 搜尋結果的次數。' + (dayMarkers.length > 0 ? '虛線是演出日。' : '')}>
              <AreaChart data={dailyImpressions} markers={dayMarkers} viewsLabel="曝光" hideUsers />
            </Card>
            <Card title="每日點擊" note="有人從搜尋結果點進來的次數。">
              <AreaChart data={dailyClicks} markers={dayMarkers} viewsLabel="點擊" hideUsers />
            </Card>
          </div>

          <Card title="訪客搜了什麼字" note="依點擊次數排序，前 20 個搜尋字。排名是這個字在搜尋結果的平均名次（1 是第一個）。">
            <ResultTable rows={queries} label="搜尋字" labelOf={(k) => k} />
          </Card>

          <Card title="哪些頁面被搜尋找到" note="依點擊次數排序，前 20 個頁面。">
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
    </>
  );
}
