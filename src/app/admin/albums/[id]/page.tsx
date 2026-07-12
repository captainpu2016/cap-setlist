import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AlbumForm from '../album-form';
import type { Album } from '@/types/database';

export default async function EditAlbumPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: album } = await supabase
    .from('albums')
    .select('*')
    .eq('id', params.id)
    .single<Album>();

  if (!album) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-stone-900">編輯專輯</h1>
      <div className="mt-6">
        <AlbumForm album={album} />
      </div>
    </div>
  );
}
