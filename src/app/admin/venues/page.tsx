import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Venue } from '@/types/database';

export default async function AdminVenuesPage() {
  const supabase = createClient();
  const { data: venues } = await supabase
    .from('venues')
    .select('*, shows(count)')
    .order('city', { ascending: true, nullsFirst: false })
    .returns<(Venue & { shows: { count: number }[] })[]>();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-stone-900">場地管理</h1>
        <Link href="/admin/venues/new" className="admin-btn">+ 新增場地</Link>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        場次編輯頁的「場地」是從這裡選的，經緯度也在這裡統一維護，改一次全部場次都會套用。
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">城市</th>
              <th className="px-4 py-3">場地名稱</th>
              <th className="px-4 py-3">座標</th>
              <th className="px-4 py-3">使用次數</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(venues ?? []).map((venue) => (
              <tr key={venue.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-500">{venue.city ?? '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/venues/${venue.id}`} className="font-medium text-stone-900 hover:underline">
                    {venue.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {venue.latitude != null && venue.longitude != null ? (
                    <span className="text-green-600">已設定</span>
                  ) : (
                    <span className="text-stone-400">依城市自動定位</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-500">{venue.shows?.[0]?.count ?? 0} 場</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(venues ?? []).length === 0 && (
          <p className="p-6 text-center text-sm text-stone-500">還沒有建立任何場地。</p>
        )}
      </div>
    </div>
  );
}
