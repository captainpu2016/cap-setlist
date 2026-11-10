import { runReport, type ReportRow } from '@/lib/ga4';
import { addDays, resolveRange, type RangePreset } from '@/lib/date-range';
import AreaChart from '../analytics/area-chart';
import { classifySource } from '../analytics/helpers';
import { BarList, Card, StatCard, type BarRow } from '../analytics/charts';
import RangeControls from '../range-controls';

export const TRAFFIC_PRESETS: RangePreset[] = [
  { key: '7', label: '近 7 天', days: 7 },
  { key: '28', label: '近 28 天', days: 28 },
  { key: '90', label: '近 90 天', days: 90 }
];

const COUNTRY_NAMES: Record<string, string> = {
  Taiwan: '台灣', Japan: '日本', 'United States': '美國', 'Hong Kong': '香港', Macao: '澳門', 'South Korea': '韓國',
  Singapore: '新加坡', Malaysia: '馬來西亞', China: '中國', Thailand: '泰國', 'United Kingdom': '英國', Canada: '加拿大',
  Australia: '澳洲', Germany: '德國', France: '法國'
};
const DEVICE_NAMES: Record<string, string> = { mobile: '手機', desktop: '電腦', tablet: '平板' };

const nf = new Intl.NumberFormat('zh-TW');

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? m + ' 分 ' + s + ' 秒' : s + ' 秒';
}

/**
 * 另一個網站（日文官網）的 GA4 訪客流量：只用標準數據（沒有我們自訂的事件），
 * 和本站的「訪客流量」分開計算，不做任何合併。
 */
export default async function JpTraffic({
  propertyId,
  searchParams,
  basePath,
  extra
}: {
  propertyId: string;
  searchParams: { range?: string; from?: string; to?: string };
  basePath: string;
  extra?: Record<string, string>;
}) {
  const range = resolveRange(searchParams, TRAFFIC_PRESETS, '28', 0);
  const { from, to, dayCount, prevFrom, prevTo } = range;
  const cur = { startDate: from, endDate: to, propertyId };
  const prev = { startDate: prevFrom, endDate: prevTo, propertyId };
  const totalMetrics = ['activeUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'newUsers'];

  let error: string | null = null;
  let curTotals: ReportRow | undefined;
  let prevTotals: ReportRow | undefined;
  let daily: ReportRow[] = [];
  let pages: ReportRow[] = [];
  let sources: ReportRow[] = [];
  let countries: ReportRow[] = [];
  let devices: ReportRow[] = [];
  let userTypes: ReportRow[] = [];
  try {
    [[curTotals], [prevTotals], daily, pages, sources, countries, devices, userTypes] = await Promise.all([
      runReport({ ...cur, metrics: totalMetrics }),
      runReport({ ...prev, metrics: totalMetrics }),
      runReport({ ...cur, dimensions: ['date'], metrics: ['activeUsers', 'screenPageViews'], orderBy: { dimension: 'date', desc: false }, limit: 400 }),
      runReport({ ...cur, dimensions: ['pagePath', 'pageTitle'], metrics: ['screenPageViews'], orderBy: { metric: 'screenPageViews' }, limit: 12 }),
      runReport({ ...cur, dimensions: ['sessionSource'], metrics: ['sessions'], orderBy: { metric: 'sessions' }, limit: 60 }),
      runReport({ ...cur, dimensions: ['country'], metrics: ['activeUsers'], orderBy: { metric: 'activeUsers' }, limit: 10 }),
      runReport({ ...cur, dimensions: ['deviceCategory'], metrics: ['activeUsers'], orderBy: { metric: 'activeUsers' }, limit: 5 }),
      runReport({ ...cur, dimensions: ['newVsReturning'], metrics: ['activeUsers'], limit: 5 })
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : '讀取 GA4 失敗';
  }

  const t = (i: number) => curTotals?.metrics[i] ?? 0;
  const p = (i: number) => prevTotals?.metrics[i] ?? 0;

  const byDate = new Map(daily.map((r) => [r.dims[0], r]));
  const dailyData = Array.from({ length: dayCount }, (_, i) => {
    const iso = addDays(from, i);
    const d = new Date(iso + 'T00:00:00Z');
    const row = byDate.get(iso.replace(/-/g, ''));
    return { date: iso, label: d.getUTCMonth() + 1 + '/' + d.getUTCDate(), users: row?.metrics[0] ?? 0, views: row?.metrics[1] ?? 0 };
  });

  const pageBars: BarRow[] = pages.map((r) => {
    const title = r.dims[1] && r.dims[1] !== '(not set)' ? r.dims[1] : '';
    return { name: title || (r.dims[0] === '/' ? '首頁' : r.dims[0]), sub: title ? r.dims[0] : undefined, value: r.metrics[0] };
  });

  const groups = new Map<string, number>();
  for (const r of sources) groups.set(classifySource(r.dims[0]), (groups.get(classifySource(r.dims[0])) ?? 0) + r.metrics[0]);
  const sourceBars: BarRow[] = Array.from(groups.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const countryBars: BarRow[] = countries
    .filter((r) => r.dims[0] && r.dims[0] !== '(not set)')
    .map((r) => ({ name: COUNTRY_NAMES[r.dims[0]] ?? r.dims[0], value: r.metrics[0] }));
  const deviceBars: BarRow[] = devices.map((r) => ({ name: DEVICE_NAMES[r.dims[0]] ?? r.dims[0], value: r.metrics[0] }));

  const newUsers = userTypes.find((r) => r.dims[0] === 'new')?.metrics[0] ?? 0;
  const returning = userTypes.find((r) => r.dims[0] === 'returning')?.metrics[0] ?? 0;
  const userBars: BarRow[] = [
    { name: '新訪客', value: newUsers },
    { name: '回訪', value: returning }
  ].filter((r) => r.value > 0);

  return (
    <>
      <p className="max-w-xl text-sm text-stone-500">
        資料來自這個網站自己的 Google Analytics 4，約每小時更新，和本站的數據分開計算、不合併。因為是另一個網站，只有標準數據（沒有歌曲點擊這類自訂事件）。
      </p>
      <div className="mt-3">
        <RangeControls presets={TRAFFIC_PRESETS} range={range} basePath={basePath} extra={extra} />
      </div>

      {error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700">
          <p>{error}</p>
          <p className="mt-2 text-red-600">
            如果是 403 或沒有權限：請確認 service account 已加進這個網站的 GA4 資源（管理 → 資源存取管理 → 檢視者），而且資源 ID 正確。
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="訪客" value={nf.format(t(0))} cur={t(0)} prev={p(0)} />
            <StatCard label="瀏覽量" value={nf.format(t(2))} cur={t(2)} prev={p(2)} />
            <StatCard label="造訪次數" value={nf.format(t(1))} cur={t(1)} prev={p(1)} />
            <StatCard label="平均停留" value={fmtDuration(t(3))} cur={t(3)} prev={p(3)} />
          </div>

          <Card title="每日趨勢">
            <AreaChart data={dailyData} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="熱門頁面" note="依瀏覽量，前 12 個。">
              <BarList rows={pageBars} unit="次" showShare={false} />
            </Card>
            <div className="space-y-4">
              <Card title="流量來源">
                <BarList rows={sourceBars} unit="次" />
              </Card>
              <Card title="新訪客與回訪">
                <BarList rows={userBars} unit="人" />
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="訪客來自哪些國家">
              <BarList rows={countryBars} unit="人" />
            </Card>
            <Card title="裝置">
              <BarList rows={deviceBars} unit="人" />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
