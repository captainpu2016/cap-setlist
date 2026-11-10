import { runReport, type ReportRow } from '@/lib/ga4';
import { addDays, resolveRange, type RangePreset } from '@/lib/date-range';
import AreaChart from '../analytics/area-chart';
import { classifySource } from '../analytics/helpers';
import { BarList, Card, Heatmap, StatCard, type BarRow } from '../analytics/charts';
import RangeControls from '../range-controls';

export const TRAFFIC_PRESETS: RangePreset[] = [
  { key: '7', label: '近 7 天', days: 7 },
  { key: '28', label: '近 28 天', days: 28 },
  { key: '90', label: '近 90 天', days: 90 }
];

const COUNTRY_NAMES: Record<string, string> = {
  Taiwan: '台灣', Japan: '日本', 'United States': '美國', 'Hong Kong': '香港', Macao: '澳門', 'South Korea': '韓國',
  Singapore: '新加坡', Malaysia: '馬來西亞', China: '中國', Thailand: '泰國', 'United Kingdom': '英國', Canada: '加拿大',
  Australia: '澳洲', Germany: '德國', France: '法國', Indonesia: '印尼', Philippines: '菲律賓', Vietnam: '越南'
};
const DEVICE_NAMES: Record<string, string> = { mobile: '手機', desktop: '電腦', tablet: '平板' };
const EVENT_NAMES: Record<string, string> = {
  page_view: '頁面瀏覽', session_start: '開始造訪', first_visit: '首次造訪', user_engagement: '有效互動', scroll: '捲動到頁面底部',
  click: '外部連結點擊', file_download: '檔案下載', video_start: '影片開始播放', video_progress: '影片播放進度', video_complete: '影片播放完畢',
  form_start: '開始填表', form_submit: '送出表單'
};

const nf = new Intl.NumberFormat('zh-TW');
const pctText = (v: number) => (v * 100).toFixed(1) + '%';

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? m + ' 分 ' + s + ' 秒' : s + ' 秒';
}

const eventIs = (name: string) => ({ filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: name } } });

/** 頁面路徑轉成好讀的名稱：首頁、或去掉結尾斜線的路徑 */
function pathLabel(path: string): string {
  if (!path || path === '/') return '首頁';
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

/**
 * 另一個網站（日文官網）的 GA4 訪客流量：只用標準數據（沒有我們自訂的事件），
 * 和本站的「訪客流量」分開計算，不做任何合併。核心數據讀取失敗才會整頁報錯，
 * 進階的區塊（外連點擊、時段等）讀不到就只是那一塊空白，不影響其他區塊。
 */
export default async function JpTraffic({
  propertyId,
  host,
  country = 'all',
  searchParams,
  basePath,
  extra
}: {
  propertyId: string;
  /** 網站的網域，用來只看站內的頁面動線（例如 captainpu.ryzm.jp） */
  host: string;
  /** 只看來自日本的訪客（jp）、日本以外（other），或全部（all） */
  country?: 'all' | 'jp' | 'other';
  searchParams: { range?: string; from?: string; to?: string };
  basePath: string;
  extra?: Record<string, string>;
}) {
  const range = resolveRange(searchParams, TRAFFIC_PRESETS, '28', 0);
  const { from, to, dayCount, prevFrom, prevTo } = range;
  const cur = { startDate: from, endDate: to, propertyId };
  const prev = { startDate: prevFrom, endDate: prevTo, propertyId };
  const totalMetrics = ['activeUsers', 'newUsers', 'screenPageViews', 'sessions', 'engagementRate', 'averageSessionDuration', 'screenPageViewsPerSession'];

  // 國家篩選：GA4 的 country 欄位是英文國名（Japan）。其他篩選條件（例如站內動線）用 andGroup 疊上去
  const japan = { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'Japan' } } };
  const countryExpr = country === 'jp' ? japan : country === 'other' ? { notExpression: japan } : null;
  const run = (o: Parameters<typeof runReport>[0]) =>
    runReport(
      countryExpr
        ? { ...o, dimensionFilter: o.dimensionFilter ? { andGroup: { expressions: [o.dimensionFilter, countryExpr] } } : countryExpr }
        : o
    );

  // 進階區塊：讀不到就當作空的，不讓整頁壞掉
  const safe = async (p: Promise<ReportRow[]>): Promise<ReportRow[]> => {
    try {
      return await p;
    } catch {
      return [];
    }
  };

  let error: string | null = null;
  let curTotals: ReportRow | undefined;
  let prevTotals: ReportRow | undefined;
  let daily: ReportRow[] = [];
  try {
    [[curTotals], [prevTotals], daily] = await Promise.all([
      run({ ...cur, metrics: totalMetrics }),
      run({ ...prev, metrics: totalMetrics }),
      run({ ...cur, dimensions: ['date'], metrics: ['activeUsers', 'screenPageViews'], orderBy: { dimension: 'date', desc: false }, limit: 400 })
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : '讀取 GA4 失敗';
  }

  const [pages, landing, flow, sources, sourceMedium, outbound, countries, cities, languages, devices, browsers, userTypes, hours, events] = error
    ? [[], [], [], [], [], [], [], [], [], [], [], [], [], []]
    : await Promise.all([
        safe(run({ ...cur, dimensions: ['pagePath', 'pageTitle'], metrics: ['screenPageViews', 'activeUsers', 'userEngagementDuration'], orderBy: { metric: 'screenPageViews' }, limit: 15 })),
        safe(run({ ...cur, dimensions: ['landingPage'], metrics: ['sessions'], orderBy: { metric: 'sessions' }, limit: 8 })),
        safe(
          run({
            ...cur,
            dimensions: ['pageReferrer', 'pagePath'],
            metrics: ['screenPageViews'],
            orderBy: { metric: 'screenPageViews' },
            limit: 200,
            dimensionFilter: { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: host } } }
          })
        ),
        safe(run({ ...cur, dimensions: ['sessionSource'], metrics: ['sessions'], orderBy: { metric: 'sessions' }, limit: 80 })),
        safe(run({ ...cur, dimensions: ['sessionSourceMedium'], metrics: ['sessions'], orderBy: { metric: 'sessions' }, limit: 10 })),
        safe(run({ ...cur, dimensions: ['linkDomain', 'linkUrl'], metrics: ['eventCount'], orderBy: { metric: 'eventCount' }, limit: 60, dimensionFilter: eventIs('click') })),
        safe(run({ ...cur, dimensions: ['country'], metrics: ['activeUsers'], orderBy: { metric: 'activeUsers' }, limit: 10 })),
        safe(run({ ...cur, dimensions: ['city'], metrics: ['activeUsers'], orderBy: { metric: 'activeUsers' }, limit: 12 })),
        safe(run({ ...cur, dimensions: ['language'], metrics: ['activeUsers'], orderBy: { metric: 'activeUsers' }, limit: 8 })),
        safe(run({ ...cur, dimensions: ['deviceCategory'], metrics: ['activeUsers'], orderBy: { metric: 'activeUsers' }, limit: 5 })),
        safe(run({ ...cur, dimensions: ['browser'], metrics: ['activeUsers'], orderBy: { metric: 'activeUsers' }, limit: 6 })),
        safe(run({ ...cur, dimensions: ['newVsReturning'], metrics: ['activeUsers'], limit: 5 })),
        safe(run({ ...cur, dimensions: ['dayOfWeek', 'hour'], metrics: ['sessions'], limit: 200 })),
        safe(run({ ...cur, dimensions: ['eventName'], metrics: ['eventCount'], orderBy: { metric: 'eventCount' }, limit: 15 }))
      ]);

  const t = (i: number) => curTotals?.metrics[i] ?? 0;
  const p = (i: number) => prevTotals?.metrics[i] ?? 0;

  const byDate = new Map(daily.map((r) => [r.dims[0], r]));
  const dailyData = Array.from({ length: dayCount }, (_, i) => {
    const iso = addDays(from, i);
    const d = new Date(iso + 'T00:00:00Z');
    const row = byDate.get(iso.replace(/-/g, ''));
    return { date: iso, label: d.getUTCMonth() + 1 + '/' + d.getUTCDate(), users: row?.metrics[0] ?? 0, views: row?.metrics[1] ?? 0 };
  });

  // 熱門頁面表
  const pageRows = pages.map((r) => {
    const title = r.dims[1] && r.dims[1] !== '(not set)' ? r.dims[1] : '';
    const views = r.metrics[0];
    const users = r.metrics[1];
    return { path: r.dims[0], title, views, users, avgEngage: users > 0 ? r.metrics[2] / users : 0 };
  });

  const landingBars: BarRow[] = landing.map((r) => ({ name: pathLabel(r.dims[0]), value: r.metrics[0] }));

  // 站內動線：上一頁 → 這一頁
  const flowMap = new Map<string, number>();
  for (const r of flow) {
    let fromPath: string;
    try {
      fromPath = new URL(r.dims[0]).pathname;
    } catch {
      continue;
    }
    if (fromPath === r.dims[1]) continue; // 重新整理
    const key = pathLabel(fromPath) + ' → ' + pathLabel(r.dims[1]);
    flowMap.set(key, (flowMap.get(key) ?? 0) + r.metrics[0]);
  }
  const flowBars: BarRow[] = Array.from(flowMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  // 流量來源
  const groups = new Map<string, number>();
  for (const r of sources) {
    const g = classifySource(r.dims[0]);
    groups.set(g, (groups.get(g) ?? 0) + r.metrics[0]);
  }
  const sourceBars: BarRow[] = Array.from(groups.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const sourceMediumBars: BarRow[] = sourceMedium.map((r) => ({ name: r.dims[0], value: r.metrics[0] }));

  // 外連點擊（歌迷點了哪些外部連結：串流平台、社群、購票…）
  const domains = new Map<string, number>();
  for (const r of outbound) if (r.dims[0] && r.dims[0] !== '(not set)') domains.set(r.dims[0], (domains.get(r.dims[0]) ?? 0) + r.metrics[0]);
  const domainBars: BarRow[] = Array.from(domains.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  const urlBars: BarRow[] = outbound
    .filter((r) => r.dims[1] && r.dims[1] !== '(not set)')
    .slice(0, 10)
    .map((r) => ({ name: r.dims[1].replace(/^https?:\/\//, ''), value: r.metrics[0] }));

  const valid = (v: string) => Boolean(v) && v !== '(not set)';
  const countryBars: BarRow[] = countries.filter((r) => valid(r.dims[0])).map((r) => ({ name: COUNTRY_NAMES[r.dims[0]] ?? r.dims[0], value: r.metrics[0] }));
  const cityBars: BarRow[] = cities.filter((r) => valid(r.dims[0])).map((r) => ({ name: r.dims[0], value: r.metrics[0] }));
  const languageBars: BarRow[] = languages.filter((r) => valid(r.dims[0])).map((r) => ({ name: r.dims[0], value: r.metrics[0] }));
  const deviceBars: BarRow[] = devices.map((r) => ({ name: DEVICE_NAMES[r.dims[0]] ?? r.dims[0], value: r.metrics[0] }));
  const browserBars: BarRow[] = browsers.map((r) => ({ name: r.dims[0], value: r.metrics[0] }));

  const newUsers = userTypes.find((r) => r.dims[0] === 'new')?.metrics[0] ?? 0;
  const returning = userTypes.find((r) => r.dims[0] === 'returning')?.metrics[0] ?? 0;
  const userBars: BarRow[] = [
    { name: '新訪客', value: newUsers },
    { name: '回訪', value: returning }
  ].filter((r) => r.value > 0);

  const cells: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of hours) {
    const dow = (Number(r.dims[0]) + 6) % 7;
    const h = Number(r.dims[1]);
    if (dow >= 0 && dow < 7 && h >= 0 && h < 24) cells[dow][h] += r.metrics[0];
  }

  const eventBars: BarRow[] = events.map((r) => ({ name: EVENT_NAMES[r.dims[0]] ?? r.dims[0], value: r.metrics[0] }));

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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="訪客" value={nf.format(t(0))} cur={t(0)} prev={p(0)} />
            <StatCard label="新訪客" value={nf.format(t(1))} cur={t(1)} prev={p(1)} />
            <StatCard label="瀏覽量" value={nf.format(t(2))} cur={t(2)} prev={p(2)} />
            <StatCard label="造訪次數" value={nf.format(t(3))} cur={t(3)} prev={p(3)} />
            <StatCard label="互動率" value={pctText(t(4))} cur={t(4)} prev={p(4)} hint="較前一期（有互動的造訪占比）" />
            <StatCard label="平均停留" value={fmtDuration(t(5))} cur={t(5)} prev={p(5)} />
          </div>

          <Card title="每日趨勢">
            <AreaChart data={dailyData} />
          </Card>

          <Card title="熱門頁面" note={'依瀏覽量，前 15 個。平均互動時間 = 每位訪客在該頁實際互動的時間。每次造訪平均看 ' + t(6).toFixed(1) + ' 頁。'}>
            {pageRows.length === 0 ? (
              <p className="text-sm text-stone-400">這段期間還沒有資料。</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs text-stone-400">
                    <tr>
                      <th className="px-2 py-2 font-normal">頁面</th>
                      <th className="px-2 py-2 text-right font-normal">瀏覽量</th>
                      <th className="px-2 py-2 text-right font-normal">訪客</th>
                      <th className="px-2 py-2 text-right font-normal">平均互動時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {pageRows.map((r) => (
                      <tr key={r.path + r.title}>
                        <td className="max-w-[22rem] px-2 py-2.5">
                          <span className="block truncate text-stone-800" title={r.title || r.path}>{r.title || pathLabel(r.path)}</span>
                          <span className="block truncate text-[11px] text-stone-400">{r.path}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-stone-900">{nf.format(r.views)}</td>
                        <td className="px-2 py-2.5 text-right text-stone-600">{nf.format(r.users)}</td>
                        <td className="px-2 py-2.5 text-right text-stone-600">{fmtDuration(r.avgEngage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="從哪一頁進站" note="訪客第一個看到的頁面。">
              <BarList rows={landingBars} unit="次" />
            </Card>
            <Card title="站內怎麼逛" note="從哪一頁走到哪一頁，次數愈多代表這條動線愈常被走。">
              <BarList rows={flowBars} unit="次" showShare={false} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="流量來源" note="來源已歸類（搜尋、社群、AI 助手…）。">
              <BarList rows={sourceBars} unit="次" />
            </Card>
            <Card title="來源 / 媒介" note="更細的來源，前 10 個。">
              <BarList rows={sourceMediumBars} unit="次" />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="點了哪些外部連結（依網站）" note="歌迷離開日文站、點去哪裡：串流平台、社群、購票等。需要網站有 GA4 的「外部連結點擊」自動追蹤。">
              <BarList rows={domainBars} unit="次" />
            </Card>
            <Card title="最常點的外部連結" note="完整連結，前 10 個。">
              <BarList rows={urlBars} unit="次" showShare={false} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="訪客來自哪些國家">
              <BarList rows={countryBars} unit="人" />
            </Card>
            <Card title="訪客來自哪些城市">
              <BarList rows={cityBars} unit="人" />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="瀏覽器語言" note="例如 ja 是日文、zh-tw 是繁體中文。">
              <BarList rows={languageBars} unit="人" />
            </Card>
            <Card title="裝置">
              <BarList rows={deviceBars} unit="人" />
            </Card>
            <Card title="瀏覽器">
              <BarList rows={browserBars} unit="人" />
            </Card>
          </div>

          <Card title="什麼時候最多人上線" note="依造訪次數，時間是 GA4 資源設定的時區。">
            <Heatmap cells={cells} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="新訪客與回訪">
              <BarList rows={userBars} unit="人" />
            </Card>
            <Card title="發生最多的動作（事件）" note="GA4 自動收集的互動，例如捲動、外部連結點擊、影片播放。">
              <BarList rows={eventBars} unit="次" showShare={false} />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
