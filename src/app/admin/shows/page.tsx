import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatShowDate } from '@/lib/format';
import type { Show } from '@/types/database';
import { SHOW_CATEGORIES } from '@/lib/show-category';
import ClassificationCell from './classification-cell';

export default async function AdminShowsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const supabase = createClient();
  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .order('show_date', { ascending: false })
    .returns<Show[]>();

  const all = shows ?? [];
  const hasClassification = all.some((s) => 'category' in s);
  const uncategorized = all.filter((s) => !s.category).length;
  const filter = searchParams.filter ?? 'all';
  const visible = all.filter((s) => {
    if (filter === 'uncategorized') return !s.category;
    if (SHOW_CATEGORIES.some((c) => c.value === filter)) return s.category === filter;
    return true;
  });
  const seriesOptions = Array.from(new Set(all.map((s) => s.series).filter((x): x is string => Boolean(x)))).sort((a, b) =>
    a.localeCompare(b, 'zh-Hant')
  );
  const tabs = [
    { key: 'all', label: `全部 ${all.length}` },
    { key: 'uncategorized', label: `未分類 ${uncategorized}` },
    ...SHOW_CATEGORIES.map((c) => ({ key: c.value as string, label: `${c.label} ${all.filter((s) => s.category === c.value).length}` }))
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-stone-900">場次管理</h1>
        <Link href="/admin/shows/new" className="admin-btn">+ 新增場次</Link>
      </div>

      {hasClassification && (
        <>
          <p className="mt-2 text-sm text-stone-500">
            分類與系列可以直接在列表上改，選了或輸入完就會自動儲存。{uncategorized > 0 && <span className="text-amber-600">還有 {uncategorized} 場未分類。</span>}
          </p>
          <div className="mt-4 flex flex-wrap gap-1 text-sm">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.key === 'all' ? '/admin/shows' : `/admin/shows?filter=${t.key}`}
                className={`rounded-md border px-3 py-1 ${filter === t.key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'}`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <datalist id="admin-series-options">
            {seriesOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">場次</th>
              {hasClassification && <th className="px-4 py-3">分類／系列</th>}
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3">播放清單</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {visible.map((show) => (
              <tr key={show.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/shows/${show.id}/setlist`} className="font-medium text-stone-900 hover:underline">
                    {show.title}
                  </Link>
                  {show.venue && <p className="text-xs text-stone-400">{show.venue}</p>}
                </td>
                {hasClassification && (
                  <td className="px-4 py-3">
                    <ClassificationCell showId={show.id} category={show.category ?? null} series={show.series ?? null} />
                  </td>
                )}
                <td className="px-4 py-3 text-stone-500">{formatShowDate(show.show_date)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      show.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {show.status === 'published' ? '已上架' : '草稿'}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-500">{show.spotify_playlist_url ? '已生成' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-6 text-center text-sm text-stone-500">沒有符合的場次。</p>
        )}
      </div>
    </div>
  );
}
