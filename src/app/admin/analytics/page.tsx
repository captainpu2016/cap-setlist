import Link from 'next/link';
import { isGa4Configured, runReport, type ReportRow } from '@/lib/ga4';
import { getArchive, displaySongTitle } from '@/lib/archive';
import { getCity, todayTaipei } from '@/lib/format';
import { getSiteUrl } from '@/lib/seo';
import { createAdminClient } from '@/lib/supabase/admin';
import AreaChart from './area-chart';
import { BarList, Card, Heatmap, StatCard, type BarRow } from './charts';
import { classifySource, isAiSource, normalizeCity, toTaiwanCity } from './helpers';

export const dynamic = 'force-dynamic';

const RANGES = [
  { key: '7', label: '近 7 天', days: 7 },
  { key: '28', label: '近 28 天', days: 28 },
  { key: '90', label: '近 90 天', days: 90 }
];

const EVENT_LABELS: Record<string, string> = {
  ticket_click: '購票點擊',
  streaming_link_click: '串流連結點擊',
  dropbox_preview_play: '試聽播放',
  share_card_download: '圖卡下載',
  calendar_subscribe: '行事曆訂閱'
};

const DEVICE_LABELS: Record<string, string> = { mobile: '手機', desktop: '電腦', tablet: '平板' };

const nf = new Intl.NumberFormat('zh-TW');

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const PAGE_TYPE: [RegExp, string][] = [
  [/^\/$/, '首頁'],
  [/^\/shows\/?$/, '全部場次'],
  [/^\/show\/[^/]+\/?$/, '場次頁'],
  [/^\/song\/[^/]+\/?$/, '歌曲頁'],
  [/^\/tour\/?$/, '巡演足跡'],
  [/^\/stats\/?$/, '歌單統計'],
  [/^\/search\/?$/, '搜尋'],
  [/^\/me\/?$/, '我的紀錄'],
  [/^\/about\/?$/, '關於本站']
];

function pageType(path: string): string {
  for (const [re, label] of PAGE_TYPE) if (re.test(path)) return label;
  return path;
}

/** 自訂維度還沒在 GA 註冊時 API 會報錯：這類報表失敗不影響整頁，只標記為「尚未啟用」 */
async function optional(p: Promise<ReportRow[]>): Promise<{ rows: ReportRow[]; failed: boolean }> {
  try {
    return { rows: await p, failed: false };
  } catch {
    return { rows: [], failed: true };
  }
}

const eventIs = (name: string) => ({ filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: name } } });

const startsWith = (fieldName: string, value: string) => ({
  filter: { fieldName, stringFilter: { matchType: 'BEGINS_WITH', value } }
});

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: { range?: string } }) {
  const range = RANGES.find((r) => r.key === searchParams.range) ?? RANGES[1];

  if (!isGa4Configured()) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-stone-900">網站數據</h1>
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
          <p className="font-bold">尚未連接 Google Analytics</p>
          <p className="mt-2">請在環境變數（本機 .env.local、正式站 Vercel）設定 <code>GA4_PROPERTY_ID</code> 與 <code>GA4_SERVICE_ACCOUNT_JSON</code>，並把 service account 的 email 加進 GA 的「資源存取管理」（檢視者）。</p>
        </div>
      </div>
    );
  }

  const d = range.days;
  const cur = { startDate: `${d}daysAgo`, endDate: 'today' };
  const prev = { startDate: `${d * 2}daysAgo`, endDate: `${d + 1}daysAgo` };
  const totalMetrics = ['activeUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'newUsers'];

  let error: string | null = null;
  let curTotals: ReportRow | undefined;
  let prevTotals: ReportRow | undefined;
  let daily: ReportRow[] = [];
  let cityRows: ReportRow[] = [];
  let songPages: ReportRow[] = [];
  let showPages: ReportRow[] = [];
  let ticketRows: ReportRow[] = [];
  let sources: ReportRow[] = [];
  let userTypes: ReportRow[] = [];
  let hours: ReportRow[] = [];
  let devices: ReportRow[] = [];
  let events: ReportRow[] = [];

  try {
    [[curTotals], [prevTotals], daily, cityRows, songPages, showPages, ticketRows, sources, userTypes, hours, devices, events] =
      await Promise.all([
        runReport({ ...cur, metrics: totalMetrics }),
        runReport({ ...prev, metrics: totalMetrics }),
        runReport({ ...cur, dimensions: ['date'], metrics: ['activeUsers', 'screenPageViews'], orderBy: { dimension: 'date', desc: false }, limit: 100 }),
        runReport({
          ...cur,
          dimensions: ['country', 'city'],
          metrics: ['activeUsers'],
          orderBy: { metric: 'activeUsers' },
          limit: 15,
          dimensionFilter: { notExpression: { filter: { fieldName: 'city', stringFilter: { matchType: 'EXACT', value: '(not set)' } } } }
        }),
        runReport({ ...cur, dimensions: ['pagePath'], metrics: ['screenPageViews'], orderBy: { metric: 'screenPageViews' }, limit: 12, dimensionFilter: startsWith('pagePath', '/song/') }),
        runReport({ ...cur, dimensions: ['pagePath'], metrics: ['screenPageViews'], orderBy: { metric: 'screenPageViews' }, limit: 60, dimensionFilter: startsWith('pagePath', '/show/') }),
        runReport({
          ...cur,
          dimensions: ['pagePath'],
          metrics: ['eventCount'],
          limit: 100,
          dimensionFilter: {
            andGroup: {
              expressions: [
                startsWith('pagePath', '/show/'),
                { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'ticket_click' } } }
              ]
            }
          }
        }),
        runReport({ ...cur, dimensions: ['sessionSource'], metrics: ['sessions'], orderBy: { metric: 'sessions' }, limit: 60 }),
        runReport({ ...cur, dimensions: ['newVsReturning'], metrics: ['activeUsers'], limit: 5 }),
        runReport({ ...cur, dimensions: ['dayOfWeek', 'hour'], metrics: ['sessions'], limit: 200 }),
        runReport({ ...cur, dimensions: ['deviceCategory'], metrics: ['activeUsers'], orderBy: { metric: 'activeUsers' }, limit: 5 }),
        runReport({
          ...cur,
          dimensions: ['eventName'],
          metrics: ['eventCount'],
          orderBy: { metric: 'eventCount' },
          limit: 30,
          dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: Object.keys(EVENT_LABELS) } } }
        })
      ]);
  } catch (e) {
    error = e instanceof Error ? e.message : '讀取 GA4 失敗';
  }

  // ── 行為軌跡：路徑與入口頁（內建維度）＋ 點擊與搜尋（需要自訂維度，失敗不影響整頁）──
  const siteHost = new URL(getSiteUrl()).host;
  const [flowRes, landingRes, clickRes, searchRes, streamSongRes, streamPlatformRes] = await Promise.all([
    optional(
      runReport({
        ...cur,
        dimensions: ['pageReferrer', 'pagePath'],
        metrics: ['screenPageViews'],
        orderBy: { metric: 'screenPageViews' },
        limit: 200,
        dimensionFilter: { filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: siteHost } } }
      })
    ),
    optional(runReport({ ...cur, dimensions: ['landingPage'], metrics: ['sessions'], orderBy: { metric: 'sessions' }, limit: 10 })),
    optional(
      runReport({ ...cur, dimensions: ['customEvent:item'], metrics: ['eventCount'], orderBy: { metric: 'eventCount' }, limit: 15, dimensionFilter: eventIs('internal_click') })
    ),
    optional(
      runReport({ ...cur, dimensions: ['customEvent:search_term'], metrics: ['eventCount'], orderBy: { metric: 'eventCount' }, limit: 15, dimensionFilter: eventIs('site_search') })
    ),
    optional(
      runReport({ ...cur, dimensions: ['customEvent:song_title'], metrics: ['eventCount'], orderBy: { metric: 'eventCount' }, limit: 10, dimensionFilter: eventIs('streaming_link_click') })
    ),
    optional(
      runReport({ ...cur, dimensions: ['customEvent:platform'], metrics: ['eventCount'], orderBy: { metric: 'eventCount' }, limit: 5, dimensionFilter: eventIs('streaming_link_click') })
    )
  ]);

  // ── 站內資料：歌名、場次、已巡演城市、報到與留言 ──────────────────────────
  const archive = await getArchive();
  const songById = new Map(archive.songs.map((s) => [s.id, s]));
  const showBySlug = new Map(archive.shows.map((s) => [s.slug, s]));
  const touredCities = new Set(
    archive.shows.map((s) => getCity(s.venue)).filter((c): c is string => Boolean(c)).map(normalizeCity)
  );

  const t = (i: number) => curTotals?.metrics[i] ?? 0;
  const p = (i: number) => prevTotals?.metrics[i] ?? 0;

  // GA 沒資料的日子不會回傳，補成 0，讓橫軸連續、演出日標示才對得上
  const byDate = new Map(daily.map((r) => [r.dims[0], r]));
  const today = todayTaipei();
  const dailyData = Array.from({ length: d + 1 }, (_, i) => {
    const day = new Date(`${today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - (d - i));
    const iso = day.toISOString().slice(0, 10);
    const row = byDate.get(iso.replace(/-/g, ''));
    return { date: iso, label: `${day.getUTCMonth() + 1}/${day.getUTCDate()}`, users: row?.metrics[0] ?? 0, views: row?.metrics[1] ?? 0 };
  });
  const showMarkers = archive.shows
    .filter((s) => s.date >= dailyData[0].date && s.date <= today)
    .map((s) => ({ date: s.date, title: s.title }));

  // 城市：台灣城市對照已巡演名單，標出「有人看卻還沒去過」
  const cityBars: BarRow[] = cityRows.slice(0, 12).map((r) => {
    const [country, city] = r.dims;
    const tw = country === 'Taiwan' ? toTaiwanCity(city) : null;
    const badge = tw
      ? touredCities.has(tw)
        ? { text: '去過', tone: 'good' as const }
        : { text: '還沒去過', tone: 'warn' as const }
      : country !== 'Taiwan'
        ? { text: '海外', tone: 'muted' as const }
        : undefined;
    return { name: tw ?? city, sub: country === 'Taiwan' ? undefined : country, value: r.metrics[0], badge };
  });
  // 同一個縣市可能被拆成多個 GA 城市，合併後再排序
  const mergedCities = new Map<string, BarRow>();
  for (const row of cityBars) {
    const ex = mergedCities.get(row.name);
    if (ex) ex.value += row.value;
    else mergedCities.set(row.name, { ...row });
  }
  const cityList = Array.from(mergedCities.values()).sort((a, b) => b.value - a.value).slice(0, 10);
  const untouredHot = cityList.filter((c) => c.badge?.tone === 'warn');

  // 歌曲頁排行
  const songBars: BarRow[] = songPages
    .map((r) => {
      const id = safeDecode(r.dims[0].split('/')[2] ?? '');
      const song = songById.get(id);
      return song ? { name: displaySongTitle(song.title), value: r.metrics[0], sub: `演出過 ${song.shows.length} 場` } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, 10);

  // 場次表現：瀏覽 + 購票點擊（GA）、報到 + 留言（資料庫）
  const ticketBySlug = new Map<string, number>();
  for (const r of ticketRows) {
    const m = r.dims[0].match(/^\/show\/([^/]+)\/?$/);
    if (m) ticketBySlug.set(safeDecode(m[1]), (ticketBySlug.get(safeDecode(m[1])) ?? 0) + r.metrics[0]);
  }
  const showViews = new Map<string, number>();
  for (const r of showPages) {
    const m = r.dims[0].match(/^\/show\/([^/]+)\/?$/);
    if (!m) continue;
    const slug = safeDecode(m[1]);
    showViews.set(slug, (showViews.get(slug) ?? 0) + r.metrics[0]);
  }
  const topShows = Array.from(showViews.entries())
    .filter(([slug]) => showBySlug.has(slug))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const admin = createAdminClient();
  const showStats = await Promise.all(
    topShows.map(async ([slug, views]) => {
      const show = showBySlug.get(slug)!;
      const [att, com] = await Promise.all([
        admin.from('show_attendances').select('*', { count: 'exact', head: true }).eq('show_id', show.id),
        admin.from('show_comments').select('*', { count: 'exact', head: true }).eq('show_id', show.id).eq('status', 'visible')
      ]);
      return { slug, show, views, tickets: ticketBySlug.get(slug) ?? 0, attendances: att.count ?? 0, comments: com.count ?? 0 };
    })
  );

  // 流量來源：歸類後加總
  const groups = new Map<string, number>();
  const aiSources = new Map<string, number>();
  for (const r of sources) {
    const g = classifySource(r.dims[0]);
    groups.set(g, (groups.get(g) ?? 0) + r.metrics[0]);
    if (isAiSource(r.dims[0])) aiSources.set(r.dims[0], (aiSources.get(r.dims[0]) ?? 0) + r.metrics[0]);
  }
  const sourceBars: BarRow[] = Array.from(groups.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const aiList = Array.from(aiSources.entries()).sort((a, b) => b[1] - a[1]);

  const newUsers = userTypes.find((r) => r.dims[0] === 'new')?.metrics[0] ?? 0;
  const returning = userTypes.find((r) => r.dims[0] === 'returning')?.metrics[0] ?? 0;
  const userTotal = newUsers + returning;
  const returningPct = userTotal > 0 ? Math.round((returning / userTotal) * 100) : 0;

  // 常見瀏覽路徑：上一頁類型 → 這一頁類型（同類型合併，例如所有場次頁算同一種）
  const flowMap = new Map<string, number>();
  for (const r of flowRes.rows) {
    let fromPath: string;
    try {
      fromPath = new URL(r.dims[0]).pathname;
    } catch {
      continue;
    }
    const from = pageType(fromPath);
    const to = pageType(r.dims[1]);
    if (from === to && fromPath === r.dims[1]) continue; // 重新整理
    const key = `${from} → ${to}`;
    flowMap.set(key, (flowMap.get(key) ?? 0) + r.metrics[0]);
  }
  const flowBars: BarRow[] = Array.from(flowMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  // 入口頁：訪客第一個看到的頁面，場次與歌曲顯示名稱
  const labelPath = (path: string): string => {
    const show = path.match(/^\/show\/([^/?]+)/);
    if (show) return showBySlug.get(safeDecode(show[1]))?.title ?? pageType(path);
    const song = path.match(/^\/song\/([^/?]+)/);
    if (song) {
      const s = songById.get(safeDecode(song[1]));
      return s ? `歌曲：${displaySongTitle(s.title)}` : pageType(path);
    }
    return pageType(path.split('?')[0]);
  };
  const landingMap = new Map<string, number>();
  for (const r of landingRes.rows) {
    const label = labelPath(r.dims[0]);
    landingMap.set(label, (landingMap.get(label) ?? 0) + r.metrics[0]);
  }
  const landingBars: BarRow[] = Array.from(landingMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const toBars = (rows: ReportRow[]): BarRow[] =>
    rows.filter((r) => r.dims[0] && r.dims[0] !== '(not set)').map((r) => ({ name: r.dims[0], value: r.metrics[0] }));
  const clickBars = toBars(clickRes.rows);
  const searchBars = toBars(searchRes.rows);
  const streamSongBars = toBars(streamSongRes.rows).map((r) => ({ ...r, name: displaySongTitle(r.name) }));
  const streamPlatformBars = toBars(streamPlatformRes.rows);
  const needsDimensions = clickRes.failed || searchRes.failed || streamSongRes.failed || streamPlatformRes.failed;

  // 星期 × 小時（GA dayOfWeek: 0=週日 → 轉成 0=週一）
  const cells: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of hours) {
    const dow = (Number(r.dims[0]) + 6) % 7;
    const h = Number(r.dims[1]);
    if (dow >= 0 && dow < 7 && h >= 0 && h < 24) cells[dow][h] += r.metrics[0];
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900">網站數據</h1>
          <p className="mt-1 text-sm text-stone-500">資料來自 Google Analytics 4，約每小時更新；漲跌是和前一段同長度期間比較。登入過後台的瀏覽器不會被計入。</p>
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
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="訪客" value={nf.format(t(0))} cur={t(0)} prev={p(0)} />
            <StatCard label="新訪客" value={nf.format(t(4))} cur={t(4)} prev={p(4)} />
            <StatCard label="瀏覽量" value={nf.format(t(2))} cur={t(2)} prev={p(2)} />
            <StatCard label="平均停留" value={fmtDuration(t(3))} cur={t(3)} prev={p(3)} />
          </div>

          <Card title="每日趨勢" note={showMarkers.length > 0 ? `虛線為演出日（${showMarkers.length} 場），可以看演出前後的流量變化。` : undefined}>
            <AreaChart data={dailyData} markers={showMarkers} />
          </Card>

          <Card title="歌迷在哪裡" note="依訪客城市排序，並對照「巡演足跡」已去過的城市。">
            <BarList rows={cityList} unit="人" />
            {untouredHot.length > 0 && (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {untouredHot.map((c) => c.name).join('、')}有訪客但還沒辦過演出，可以列入巡演參考。
              </p>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="最多人點開的歌" note="歌曲頁瀏覽量排行。">
              <BarList rows={songBars} unit="次" showShare={false} />
            </Card>
            <Card title="流量從哪裡來" note="依造訪次數，來源已歸類。">
              <BarList rows={sourceBars} unit="次" />
              {aiList.length > 0 && (
                <p className="mt-4 text-xs text-stone-500">
                  AI 助手細項：{aiList.map(([name, n]) => `${name} ${n}`).join('、')}
                </p>
              )}
            </Card>
          </div>

          <Card title="場次表現" note="瀏覽與購票點擊為所選期間；報到與留言為累計。只列出所選期間瀏覽最多的場次。">
            {showStats.length === 0 ? (
              <p className="text-sm text-stone-400">這段期間還沒有場次頁的瀏覽資料。</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs text-stone-400">
                    <tr>
                      <th className="px-2 py-2 font-normal">場次</th>
                      <th className="px-2 py-2 text-right font-normal">瀏覽</th>
                      <th className="px-2 py-2 text-right font-normal">購票點擊</th>
                      <th className="px-2 py-2 text-right font-normal">報到</th>
                      <th className="px-2 py-2 text-right font-normal">留言</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {showStats.map((s) => (
                      <tr key={s.slug}>
                        <td className="max-w-[16rem] px-2 py-2.5">
                          <Link href={`/show/${s.slug}`} target="_blank" className="block truncate text-stone-800 hover:underline">
                            {s.show.title}
                          </Link>
                          <span className="text-xs text-stone-400">{s.show.date}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-stone-900">{nf.format(s.views)}</td>
                        <td className="px-2 py-2.5 text-right text-stone-600">{s.tickets || '–'}</td>
                        <td className="px-2 py-2.5 text-right text-stone-600">{s.attendances || '–'}</td>
                        <td className="px-2 py-2.5 text-right text-stone-600">{s.comments || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="訪客怎麼逛" note="從哪一種頁面走到哪一種頁面，次數愈多代表這條動線愈常被走。">
              {flowRes.failed ? (
                <p className="text-sm text-stone-400">暫時讀不到路徑資料。</p>
              ) : (
                <BarList rows={flowBars} unit="次" showShare={false} />
              )}
            </Card>
            <Card title="從哪一頁進站" note="訪客第一個看到的頁面。">
              <BarList rows={landingBars} unit="次" />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="站內點擊" note="選單、頁尾與內容區連結被點了幾次。">
              {clickRes.failed ? (
                <p className="text-sm text-stone-400">尚未啟用，見下方說明。</p>
              ) : (
                <BarList rows={clickBars} unit="次" showShare={false} />
              )}
            </Card>
            <Card title="歌迷搜了什麼歌" note="搜尋頁的關鍵字排行。">
              {searchRes.failed ? (
                <p className="text-sm text-stone-400">尚未啟用，見下方說明。</p>
              ) : (
                <BarList rows={searchBars} unit="次" showShare={false} />
              )}
            </Card>
            <Card title="串流點擊：哪首歌" note="歌單頁上串流圖示被點的歌。">
              {streamSongRes.failed ? (
                <p className="text-sm text-stone-400">尚未啟用，見下方說明。</p>
              ) : (
                <BarList rows={streamSongBars} unit="次" showShare={false} />
              )}
            </Card>
            <Card title="串流點擊：哪個平台">
              {streamPlatformRes.failed ? (
                <p className="text-sm text-stone-400">尚未啟用，見下方說明。</p>
              ) : (
                <BarList
                  rows={streamPlatformBars.map((r) => ({
                    ...r,
                    name: ({ spotify: 'Spotify', apple_music: 'Apple Music', youtube: 'YouTube' } as Record<string, string>)[r.name] ?? r.name
                  }))}
                  unit="次"
                />
              )}
            </Card>
          </div>

          {needsDimensions && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              <p className="font-bold">還有幾項需要在 GA 註冊「自訂維度」才看得到</p>
              <p className="mt-1">
                到 GA「管理 → 自訂定義 → 建立自訂維度」，範圍選「事件」，事件參數依序填入下列四個（維度名稱可自取）：
                <code> item</code>、<code>search_term</code>、<code>song_title</code>、<code>platform</code>。
                註冊後從當天開始累積，過去的點擊無法回補，大約隔天資料才會出現。
              </p>
            </div>
          )}

          <Card title="什麼時候最多人上線" note="依造訪次數，適合用來決定公告與貼文時間。">
            <Heatmap cells={cells} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="新訪客與回訪">
              {userTotal === 0 ? (
                <p className="text-sm text-stone-400">這段期間還沒有資料。</p>
              ) : (
                <>
                  <p className="text-3xl font-bold tabular-nums text-stone-900">{returningPct}%</p>
                  <p className="text-xs text-stone-400">是回訪的訪客</p>
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="bg-stone-800" style={{ width: `${100 - returningPct}%` }} />
                    <div className="bg-red-600" style={{ width: `${returningPct}%` }} />
                  </div>
                  <p className="mt-2 flex justify-between text-xs text-stone-500">
                    <span>新訪客 {nf.format(newUsers)}</span>
                    <span>回訪 {nf.format(returning)}</span>
                  </p>
                </>
              )}
            </Card>
            <Card title="裝置">
              <BarList rows={devices.map((r) => ({ name: DEVICE_LABELS[r.dims[0]] ?? r.dims[0], value: r.metrics[0] }))} unit="人" />
            </Card>
            <Card title="互動事件">
              <BarList
                rows={events.map((r) => ({ name: EVENT_LABELS[r.dims[0]] ?? r.dims[0], value: r.metrics[0] }))}
                unit="次"
                showShare={false}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
