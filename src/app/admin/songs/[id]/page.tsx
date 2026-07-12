import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SongForm from '../song-form';
import type { Album, Song } from '@/types/database';

export default async function EditSongPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: song }, { data: albums }] = await Promise.all([
    supabase.from('songs').select('*').eq('id', params.id).single<Song>(),
    supabase.from('albums').select('*').order('release_date', { ascending: false }).returns<Album[]>()
  ]);

  if (!song) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-stone-900">編輯歌曲</h1>
      <div className="mt-6">
        <SongForm song={song} albums={albums ?? []} />
      </div>
    </div>
  );
}
