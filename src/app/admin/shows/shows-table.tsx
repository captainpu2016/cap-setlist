import Link from 'next/link';
import { formatShowDateShort } from '@/lib/format';
import type { Show } from '@/types/database';
import ClassificationCell from './classification-cell';

/** 場次管理列表：日期、場次名稱、分類／系列（可直接改）、狀態。各欄固定寬度，狀態與日期不換行。 */
export default function ShowsTable({ shows, hasClassification }: { shows: Show[]; hasClassification: boolean }) {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500">
            <tr>
              <th className="w-32 whitespace-nowrap px-4 py-3 font-medium">日期</th>
              <th className="px-4 py-3 font-medium">場次</th>
              {hasClassification && <th className="w-[22rem] px-4 py-3 font-medium">分類／系列</th>}
              <th className="w-24 whitespace-nowrap px-4 py-3 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {shows.map((show) => (
              <tr key={show.id} className="align-top hover:bg-stone-50/60">
                <td className="whitespace-nowrap px-4 py-3.5 text-stone-600">{formatShowDateShort(show.show_date)}</td>
                <td className="px-4 py-3.5">
                  <Link href={`/admin/shows/${show.id}/setlist`} className="font-medium leading-snug text-stone-900 hover:underline">
                    {show.title}
                  </Link>
                  {show.venue && <p className="mt-0.5 text-xs text-stone-400">{show.venue}</p>}
                </td>
                {hasClassification && (
                  <td className="px-4 py-3">
                    <ClassificationCell
                      showId={show.id}
                      category={show.category ?? null}
                      series={show.series ?? null}
                      admission={show.admission}
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      show.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {show.status === 'published' ? '已上架' : '草稿'}
                  </span>
                  {show.spotify_playlist_url && <p className="mt-1 text-[11px] text-stone-400">有播放清單</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shows.length === 0 && <p className="p-6 text-center text-sm text-stone-500">沒有符合的場次。</p>}
    </div>
  );
}
