import Link from 'next/link';
import { isGa4Configured, runReport, type ReportRow } from '@/lib/ga4';

export const dynamic = 'force-dynamic';

const RANGES = [
  { key: '7', label: '近 7 天', days: 7 },
  { key: '28', label: '近 28 天', days: 28 },
  { key: '90', label: '近 90 天', days: 90 }
];

const EVENT_LABELS: Record<string, string> = {
  streaming_link_click: '串流連結點擊',
  dropbox_preview_play: '試聽播放',
  share_card_download: '圖卡下載',
  calendar_subscribe: '行事曆訂閱',
  ticket_click: '購票點擊'
};

const CHANNEL_LABELS: Record<string, string> = {
  'Organic Search': '自然搜尋',
  Direct: '直接進站',
  'Organic Social': '社群',
  Referral: '外部連結',
  'Paid Search': '付費搜尋',
  Email: 'Email',
  Unassigned: '未分類'
};

const DEVICE_LABELS: Record<string, string> = { mobile: '手機', desktop: '電腦', tablet: '平板' };

const nf = new Intl.NumberFormat('zh-TW');

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

function fmtDate(yyyymmdd: string) {
  return `${Number(yyyymmdd.slice(4, 6))}/${Number(yyyymmdd.slice(6, 8))}`;
}

function BarList({ rows, label }: { rows: { name: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-stone-400">這段期間還沒有資料。</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-stone-700">{r.name}</span>
            <span className="shrink-0 tabular-nums text-stone-500">
              {nf.format(r.value)} {label}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-stone-800" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: { range?: string } }) {
  const range = RANGES.find((r) => r.key === searchParams.range) ?? RANGES[1];

  if (!isGa4Configured()) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-stone-900">網站數據</h1>
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
          <p className="font-bold">尚未連接 Google Analytics</p>
          <p className="mt-2">請在環境變數（本機 .env.local、正式站 Vercel）設定：</p>
          <ul className="mt-2 list-disc pl-5">
            <li><code>GA4_PROPERTY_ID</code>：GA4 資源 ID（純數字）</li>
            <li><code>GA4_SERVICE_ACCOUNT_JSON</code>：service account 的金鑰 JSON 整份內容</li>
          </ul>
          <p className="mt-2">
            service account 的 email 需要在 GA 的「管理 → 資源存取管理」加入為「檢視者」。設定完成後重新部署即可。
          </p>
        </div>
      </div>
    );
  }

  const base = { startDate: `${range.days}daysAgo`, endDate: 'today' };
  let error: string | null = null;
  let totals: ReportRow | undefined;
  let daily: ReportRow[] = [];
  let pages: ReportRow[] = [];
  let channels: ReportRow[] = [];
  let devices: ReportRow[] = [];
  let events: ReportRow[] = [];

  try {
    [[totals], daily, pages, channels, devices, events] = await Promise.all([
      runReport({ ...base, metrics: ['activeUsers', 'sessions', 'screenPageViews', 'averageSessionDuration'] }),
      runReport({
        ...base,
        dimensions: ['date'],
        metrics: ['activeUsers', 'screenPageViews'],
        orderBy: { dimension: 'date', desc: false },
        limit: 100
      }),
      runReport({
        ...base,
        dimensions: ['pagePath', 'pageTitle'],
        metrics: ['screenPageViews'],
        orderBy: { metric: 'screenPageViews' },
        limit: 12
      }),
      runReport({
        ...base,
        dimensions: ['sessionDefaultChannelGroup'],
        metrics: ['sessions'],
        orderBy: { metric: 'sessions' },
        limit: 8
      }),
      runReport({
        ...base,
        dimensions: ['deviceCategory'],
        metrics: ['activeUsers'],
        orderBy: { metric: 'activeUsers' },
        limit: 5
      }),
      runReport({
        ...base,
        dimensions: ['eventName'],
        metrics: ['eventCount'],
        orderBy: { metric: 'eventCount' },
        limit: 30,
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: Object.keys(EVENT_LABELS) } }
        }
      })
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : '讀取 GA4 失敗';
  }

  const stat = (i: number) => totals?.metrics[i] ?? 0;
  const maxDaily = Math.max(1, ...daily.map((d) => d.metrics[1]));

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900">網站數據</h1>
          <p className="mt-1 text-sm text-stone-500">資料來自 Google Analytics 4，約每小時更新一次，當天數字可能有延遲。</p>
        </div>
        <div className="flex gap-1 rounded-md border border-stone-200 bg-white p-1 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/analytics?range=${r.key}`}
              className={`rounded px-3 py-1 ${r.key === range.key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: '訪客', value: nf.format(stat(0)) },
              { label: '造訪次數', value: nf.format(stat(1)) },
              { label: '瀏覽量', value: nf.format(stat(2)) },
              { label: '平均停留', value: fmtDuration(stat(3)) }
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-xs text-stone-500">{s.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-stone-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Card title="每日瀏覽量">
              {daily.length === 0 ? (
                <p className="text-sm text-stone-400">這段期間還沒有資料。</p>
              ) : (
                <>
                  <div className="flex h-32 items-end gap-[2px]">
                    {daily.map((d) => (
                      <div
                        key={d.dims[0]}
                        title={`${fmtDate(d.dims[0])}：${nf.format(d.metrics[1])} 次瀏覽、${nf.format(d.metrics[0])} 位訪客`}
                        className="min-w-0 flex-1 rounded-t-sm bg-stone-800"
                        style={{ height: `${Math.max(2, (d.metrics[1] / maxDaily) * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-stone-400">
                    <span>{fmtDate(daily[0].dims[0])}</span>
                    <span>{fmtDate(daily[daily.length - 1].dims[0])}</span>
                  </div>
                </>
              )}
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card title="熱門頁面">
              <BarList
                label="次"
                rows={pages.map((p) => ({
                  name: p.dims[0] === '/' ? '首頁' : p.dims[1] && p.dims[1] !== '(not set)' ? `${p.dims[1].replace(/｜普通隊長$/, '')}（${p.dims[0]}）` : p.dims[0],
                  value: p.metrics[0]
                }))}
              />
            </Card>
            <div className="space-y-4">
              <Card title="流量來源">
                <BarList
                  label="次"
                  rows={channels.map((c) => ({ name: CHANNEL_LABELS[c.dims[0]] ?? c.dims[0], value: c.metrics[0] }))}
                />
              </Card>
              <Card title="裝置">
                <BarList
                  label="人"
                  rows={devices.map((d) => ({ name: DEVICE_LABELS[d.dims[0]] ?? d.dims[0], value: d.metrics[0] }))}
                />
              </Card>
            </div>
          </div>

          <div className="mt-4">
            <Card title="互動事件">
              <BarList
                label="次"
                rows={events.map((e) => ({ name: EVENT_LABELS[e.dims[0]] ?? e.dims[0], value: e.metrics[0] }))}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
