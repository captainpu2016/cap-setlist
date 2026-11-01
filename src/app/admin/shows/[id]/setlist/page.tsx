import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ShowInfoForm from './show-info-form';
import SetlistEditor from './setlist-editor';
import SetlistTools from './setlist-tools';
import type { Show, Song, SetlistItemWithSong, Venue } from '@/types/database';

type SongWithUsage = Song & { setlist_items: { count: number }[] };

export default async function SetlistEditorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: show } = await supabase
    .from('shows')
    .select('*')
    .eq('id', params.id)
    .single<Show>();
  if (!show) notFound();

  const [{ data: items }, { data: songs }, { data: venues }, { data: others }] = await Promise.all([
    supabase
      .from('setlist_items')
      .select('*, song:songs(*)')
      .eq('show_id', show.id)
      .order('position', { ascending: true })
      .returns<SetlistItemWithSong[]>(),
    supabase.from('songs').select('*, setlist_items(count)').order('title').returns<SongWithUsage[]>(),
    supabase.from('venues').select('*').order('city').returns<Venue[]>(),
    supabase
      .from('shows')
      .select('id, title, show_date, setlist_items(count)')
      .neq('id', show.id)
      .order('show_date', { ascending: false })
      .limit(120)
      .returns<{ id: string; title: string; show_date: string; setlist_items: { count: number }[] }[]>()
  ]);

  // 已用過的系列名稱（欄位還不存在時查詢會失敗，忽略即可）
  const { data: seriesRows } = await supabase.from('shows').select('series').not('series', 'is', null).returns<{ series: string }[]>();
  const seriesOptions = Array.from(new Set((seriesRows ?? []).map((r) => r.series))).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  const songLibrary = (songs ?? []).map((s) => ({
    ...s,
    usageCount: s.setlist_items?.[0]?.count ?? 0
  }));

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-stone-900">{show.title}</h1>
      <p className="mt-1 text-sm text-stone-500">歌單編輯器</p>

      <div className="mt-6">
        <ShowInfoForm show={show} venues={venues ?? []} seriesOptions={seriesOptions} />
      </div>

      <SetlistTools
        showId={show.id}
        otherShows={(others ?? [])
          .map((s) => ({ id: s.id, title: s.title, show_date: s.show_date, songCount: s.setlist_items?.[0]?.count ?? 0 }))
          .filter((s) => s.songCount > 0)}
      />

      {/* 歌單被匯入／複製後 items 會變，用 key 讓編輯器重新載入 */}
      <SetlistEditor
        key={(items ?? []).map((i) => i.id).join(',')}
        showId={show.id}
        initialItems={items ?? []}
        songLibrary={songLibrary}
      />
    </div>
  );
}