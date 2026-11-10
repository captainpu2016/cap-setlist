import DataTabs from '../data-tabs';
import SearchPerformance from '../search-console/search-performance';
import { JP_SITE } from '@/lib/external-sites';
import { hasServiceAccount } from '@/lib/gsc';
import JpTraffic from './jp-traffic';

export const dynamic = 'force-dynamic';

type Params = { tab?: string; range?: string; from?: string; to?: string };

/**
 * 日文官網（captainpu.ryzm.jp）的數據：自己的 GA4 與 Search Console，
 * 在後台另外看，和本站的「網站數據」完全分開，不做任何合併計算。
 */
export default async function AdminJpSitePage({ searchParams }: { searchParams: Params }) {
  const tab = searchParams.tab === 'search' ? 'search' : 'traffic';
  const { tab: _tab, ...rest } = searchParams;
  void _tab;

  if (!hasServiceAccount()) {
    return (
      <div className="max-w-3xl">
        <DataTabs site="jp" active={tab} searchParams={rest} />
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
          <p className="font-bold">尚未設定 Google service account</p>
          <p className="mt-2">
            請先設定環境變數 <code>GA4_SERVICE_ACCOUNT_JSON</code>（和本站的數據共用同一個）。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <DataTabs site="jp" active={tab} searchParams={rest} />
      <p className="mb-4 text-xs text-stone-400">
        {JP_SITE.name}：{JP_SITE.url}　·　獨立計算，不與本站數據合併
      </p>
      {tab === 'search' ? (
        <SearchPerformance siteUrl={JP_SITE.gscSiteUrl} searchParams={rest} basePath="/admin/jp-site" extra={{ tab: 'search' }} />
      ) : (
        <JpTraffic propertyId={JP_SITE.ga4PropertyId} host={new URL(JP_SITE.url).host} searchParams={rest} basePath="/admin/jp-site" extra={{ tab: 'traffic' }} />
      )}
    </div>
  );
}
