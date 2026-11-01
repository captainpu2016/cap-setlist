import type { Show } from '@/types/database';
import ShowRow from './show-row';

/** 場次管理列表：日期、場次、分類、系列、（音樂祭才有的）入場方式、狀態，各欄固定寬度。 */
export default function ShowsTable({ shows, hasClassification }: { shows: Show[]; hasClassification: boolean }) {
  const hasAdmission = hasClassification && shows.some((s) => 'admission' in s);
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500">
            <tr>
              <th className="w-32 whitespace-nowrap px-4 py-3 font-medium">日期</th>
              <th className="px-4 py-3 font-medium">場次</th>
              {hasClassification && (
                <>
                  <th className="w-32 px-2 py-3 font-medium">分類</th>
                  <th className="w-52 px-2 py-3 font-medium">系列</th>
                  {hasAdmission && <th className="w-24 px-2 py-3 font-medium">入場</th>}
                </>
              )}
              <th className="w-28 whitespace-nowrap px-4 py-3 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {shows.map((show) => (
              <ShowRow
                key={show.id}
                hasClassification={hasClassification}
                hasAdmission={hasAdmission}
                show={{
                  id: show.id,
                  title: show.title,
                  show_date: show.show_date,
                  venue: show.venue,
                  status: show.status,
                  hasPlaylist: Boolean(show.spotify_playlist_url),
                  category: show.category ?? null,
                  series: show.series ?? null,
                  admission: show.admission
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      {shows.length === 0 && <p className="p-6 text-center text-sm text-stone-500">沒有符合的場次。</p>}
    </div>
  );
}
