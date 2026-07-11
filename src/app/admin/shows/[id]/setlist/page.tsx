import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ShowInfoForm from './show-info-form';
import SetlistEditor from './setlist-editor';
import type { Show, Song, SetlistItemWithSong } from '@/types/database';

type SongWithUsage = Song & { setlist_items: { count: number }[] };

export default async function SetlistEditorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: show } = await supabase
    .from('shows')
    .select('*')
    .eq('id', params.id)
    .single<Show>();
  if (!show) notFound();

  const { data: items } = await supabase
    .from('setlist_items')
    .select('*, song:songs(*)')
    .eq('show_id', show.id)
    .order('position', { ascending: true })
    .returns<SetlistItemWithSong[]>();

  const { data: songs } = await supabase
    .from('songs')
    .select('*, setlist_items(count)')
    .order('title')
    .returns<SongWithUsage[]>();

  const songLibrary = (songs ?? []).map((s) => ({
    ...s,
    usageCount: s.setlist_items?.[0]?.count ?? 0
  }));

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-stone-900">{show.title}</h1>
      <p className="mt-1 text-sm text-stone-500">歌單編輯器</p>

      <div className="mt-6">
        <ShowInfoForm show={show} />
      </div>

      <SetlistEditor
        showId={show.id}
        initialItems={items ?? []}
        songLibrary={songLibrary}
      />
    </div>
  );
}