import { createClient } from '@/lib/supabase/server';
import SongForm from '../song-form';
import type { Album } from '@/types/database';

export default async function NewSongPage() {
  const supabase = createClient();
  const { data: albums } = await supabase
    .from('albums')
    .select('*')
    .order('release_date', { ascending: false })
    .returns<Album[]>();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-stone-900">新增歌曲</h1>
      <div className="mt-6">
        <SongForm albums={albums ?? []} />
      </div>
    </div>
  );
}
