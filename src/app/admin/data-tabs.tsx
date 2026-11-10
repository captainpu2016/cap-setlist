import Link from 'next/link';

type Params = { range?: string; from?: string; to?: string };

interface Tab {
  key: 'traffic' | 'search';
  label: string;
  note: string;
  href: string;
  /** 這個分頁網址上固定要帶的參數（日文站用 tab=…） */
  params: Record<string, string>;
}

const SITES = {
  main: {
    title: '網站數據',
    tabs: [
      { key: 'traffic', label: '訪客流量', note: 'Google Analytics', href: '/admin/analytics', params: {} },
      { key: 'search', label: '搜尋表現', note: 'Search Console', href: '/admin/search-console', params: {} }
    ] as Tab[]
  },
  jp: {
    title: '日文官網數據',
    tabs: [
      { key: 'traffic', label: '訪客流量', note: 'Google Analytics', href: '/admin/jp-site', params: { tab: 'traffic' } },
      { key: 'search', label: '搜尋表現', note: 'Search Console', href: '/admin/jp-site', params: { tab: 'search' } }
    ] as Tab[]
  }
};

/**
 * 數據頁上方的標題與兩個分頁：訪客流量（GA4）與搜尋表現（Search Console）。
 * 切換分頁時帶著目前的日期區間（range / from / to），兩邊看的是同一段時間。
 * site：main 是本站；jp 是日文官網（獨立的選單，數據不與本站合併）。
 */
export default function DataTabs({
  active,
  searchParams,
  site = 'main'
}: {
  active: 'traffic' | 'search';
  searchParams?: Params;
  site?: keyof typeof SITES;
}) {
  const cfg = SITES[site];
  const carry: Record<string, string> = {};
  if (searchParams?.range) carry.range = searchParams.range;
  if (searchParams?.from) carry.from = searchParams.from;
  if (searchParams?.to) carry.to = searchParams.to;

  return (
    <div className="mb-5 border-b border-stone-200">
      <h1 className="font-display text-2xl font-bold text-stone-900">{cfg.title}</h1>
      <nav aria-label={cfg.title + '分頁'} className="mt-3 flex gap-1">
        {cfg.tabs.map((t) => {
          const query = new URLSearchParams({ ...t.params, ...carry }).toString();
          return (
            <Link
              key={t.key}
              href={query ? t.href + '?' + query : t.href}
              aria-current={t.key === active ? 'page' : undefined}
              className={
                '-mb-px border-b-2 px-4 py-2 text-sm ' +
                (t.key === active ? 'border-stone-900 font-bold text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800')
              }
            >
              {t.label}
              <span className="ml-1.5 hidden text-[11px] font-normal text-stone-400 sm:inline">{t.note}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
