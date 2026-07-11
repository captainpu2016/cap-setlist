import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatShowDate } from '@/lib/format';
import type { Show } from '@/types/database';

export default async function AdminShowsPage() {
  const supabase = createClient();
  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .order('show_date', { ascending: false })
    .returns<Show[]>();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-stone-900">場次管理</h1>
        <Link href="/admin/shows/new" className="admin-btn">+ 新增場次</Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">場次</th>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3">播放清單</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(shows ?? []).map((show) => (
              <tr key={show.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/shows/${show.id}/setlist`} className="font-medium text-stone-900 hover:underline">
                    {show.title}
                  </Link>
                  {show.venue && <p className="text-xs text-stone-400">{show.venue}</p>}
                </td>
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
        {(shows ?? []).length === 0 && (
          <p className="p-6 text-center text-sm text-stone-500">還沒有建立任何場次。</p>
        )}
      </div>
    </div>
  );
}
