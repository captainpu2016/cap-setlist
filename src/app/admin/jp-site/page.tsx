import Link from 'next/link';
import DataTabs from '../data-tabs';
import SearchPerformance from '../search-console/search-performance';
import { JP_SITE } from '@/lib/external-sites';
import { hasServiceAccount } from '@/lib/gsc';
import JpTraffic from './jp-traffic';
import { fetchPageTitles, normalizePath } from '@/lib/page-titles';

export const dynamic = 'force-dynamic';

type Params = { tab?: string; country?: string; range?: string; from?: string; to?: string };

const COUNTRY_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'jp', label: '日本' },
  { key: 'other', label: '日本以外' }
] as const;

/**
 * 日文官網（captainpu.ryzm.jp）的數據：自己的 GA4 與 Search Console，
 * 在後台另外看，和本站的「網站數據」完全分開，不做任何合併計算。
 * 可以篩選「訪客是不是來自日本」，兩個分頁都適用。
 */
export default async function AdminJpSitePage({ searchParams }: { searchParams: Params }) {
  const tab = searchParams.tab === 'search' ? 'search' : 'traffic';
  const country = searchParams.country === 'jp' || searchParams.country === 'other' ? searchParams.country : 'all';
  const { tab: _tab, country: _country, ...range } = searchParams;
  void _tab;
  void _country;
  const carry = { range: range.range, from: range.from, to: range.to, country: country === 'all' ? undefined : country };

  if (!hasServiceAccount()) {
    return (
      <div className="max-w-3xl">
        <DataTabs site="jp" active={tab} searchParams={carry} />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
          <p className="font-bold">尚未設定 Google service account</p>
          <p className="mt-2">
            請先設定環境變數 <code>GA4_SERVICE_ACCOUNT_JSON</code>（和本站的數據共用同一個）。
          </p>
        </div>
      </div>
    );
  }

  // 篩選按鈕的網址：保留目前的分頁與日期區間，只換國家
  const hrefFor = (key: string) => {
    const q = new URLSearchParams({ tab });
    if (range.range) q.set('range', range.range);
    if (range.from) q.set('from', range.from);
    if (range.to) q.set('to', range.to);
    if (key !== 'all') q.set('country', key);
    return '/admin/jp-site?' + q.toString();
  };
  // 搜尋表現的頁面欄位：網址換成日文站的頁面標題
  const titles = tab === 'search' ? await fetchPageTitles(JP_SITE.ga4PropertyId) : new Map<string, string>();
  const labelPage = (url: string) => {
    let path = url;
    try {
      path = new URL(url).pathname;
    } catch {
      /* 不是完整網址就直接用原字串 */
    }
    return titles.get(normalizePath(path)) ?? (normalizePath(path) === '/' ? '首頁' : path);
  };
  const extra: Record<string, string> = { tab };
  if (country !== 'all') extra.country = country;

  return (
    <div className="max-w-5xl">
      <DataTabs site="jp" active={tab} searchParams={carry} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-stone-400">
          {JP_SITE.name}：{JP_SITE.url}　·　獨立計算，不與本站數據合併
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-stone-500">訪客來自</span>
          <div className="flex gap-1 rounded-md border border-stone-200 bg-white p-1">
            {COUNTRY_OPTIONS.map((o) => (
              <Link
                key={o.key}
                href={hrefFor(o.key)}
                aria-current={country === o.key ? 'true' : undefined}
                className={'rounded px-3 py-1 ' + (country === o.key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')}
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {country !== 'all' && (
        <p className="mb-4 rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-600">
          目前只看<b className="mx-1 text-stone-900">{country === 'jp' ? '來自日本' : '來自日本以外'}</b>的{tab === 'search' ? '搜尋' : '訪客'}，下面所有數字都已套用這個篩選。
        </p>
      )}
      {tab === 'search' ? (
        <SearchPerformance siteUrl={JP_SITE.gscSiteUrl} country={country} labelPage={labelPage} searchParams={range} basePath="/admin/jp-site" extra={extra} />
      ) : (
        <JpTraffic
          propertyId={JP_SITE.ga4PropertyId}
          host={new URL(JP_SITE.url).host}
          country={country}
          searchParams={range}
          basePath="/admin/jp-site"
          extra={extra}
        />
      )}
    </div>
  );
}
