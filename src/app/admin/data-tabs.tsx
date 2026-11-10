import Link from 'next/link';

const TABS = [
  { key: 'traffic', label: '訪客流量', href: '/admin/analytics', note: 'Google Analytics' },
  { key: 'search', label: '搜尋表現', href: '/admin/search-console', note: 'Search Console' }
] as const;

/**
 * 「網站數據」底下的兩個分頁：訪客流量（GA4）與搜尋表現（Search Console）。
 * 切換分頁時帶著目前的日期區間（range / from / to），兩邊看的是同一段時間。
 */
export default function DataTabs({
  active,
  searchParams
}: {
  active: 'traffic' | 'search';
  searchParams?: { range?: string; from?: string; to?: string };
}) {
  const qs = new URLSearchParams();
  if (searchParams?.range) qs.set('range', searchParams.range);
  if (searchParams?.from) qs.set('from', searchParams.from);
  if (searchParams?.to) qs.set('to', searchParams.to);
  const query = qs.toString();

  return (
    <div className="mb-5 border-b border-stone-200">
      <h1 className="font-display text-2xl font-bold text-stone-900">網站數據</h1>
      <nav aria-label="網站數據分頁" className="mt-3 flex gap-1">
        {TABS.map((t) => (
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
        ))}
      </nav>
    </div>
  );
}
