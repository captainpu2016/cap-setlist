import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Album } from '@/types/database';

export default async function AdminAlbumsPage() {
  const supabase = createClient();
  const { data: albums } = await supabase
    .from('albums')
    .select('*, songs(count)')
    .order('release_date', { ascending: false, nullsFirst: false })
    .returns<(Album & { songs: { count: number }[] })[]>();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-stone-900">專輯管理</h1>
        <Link href="/admin/albums/new" className="admin-btn">+ 新增專輯</Link>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        管理歌曲所屬的專輯分類，「Cover 作品」是內建的特殊分類，用來放不屬於個人專輯的作品。
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">專輯名稱</th>
              <th className="px-4 py-3">發行日期</th>
              <th className="px-4 py-3">曲目數</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(albums ?? []).map((album) => (
              <tr key={album.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/albums/${album.id}`} className="font-medium text-stone-900 hover:underline">
                    {album.title}
                  </Link>
                  {album.is_cover && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      Cover 作品
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-500">{album.release_date ?? '—'}</td>
                <td className="px-4 py-3 text-stone-500">{album.songs?.[0]?.count ?? 0} 首</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(albums ?? []).length === 0 && (
          <p className="p-6 text-center text-sm text-stone-500">還沒有建立任何專輯。</p>
        )}
      </div>
    </div>
  );
}
