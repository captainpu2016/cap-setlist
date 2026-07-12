'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseSpotifyTrackId } from '@/lib/format';

async function requireSession() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return supabase;
}

export async function upsertSong(formData: FormData) {
  const supabase = await requireSession();

  const id = formData.get('id') as string;
  const title = (formData.get('title') as string)?.trim();
  const durationRaw = formData.get('duration_seconds') as string;
  const spotifyUrlRaw = (formData.get('spotify_input') as string)?.trim();
  const appleMusicUrl = (formData.get('apple_music_url') as string)?.trim() || null;
  const youtubeUrl = (formData.get('youtube_url') as string)?.trim() || null;
  const dropboxUrl = (formData.get('dropbox_url') as string)?.trim() || null;
  const albumId = (formData.get('album_id') as string)?.trim() || null;
  const trackNumberRaw = formData.get('track_number') as string;

  if (!title) throw new Error('歌名為必填');

  const payload = {
    title,
    duration_seconds: durationRaw ? Number(durationRaw) : null,
    spotify_track_id: spotifyUrlRaw ? parseSpotifyTrackId(spotifyUrlRaw) : null,
    apple_music_url: appleMusicUrl,
    youtube_url: youtubeUrl,
    dropbox_url: dropboxUrl,
    album_id: albumId,
    track_number: trackNumberRaw ? Number(trackNumberRaw) : null
  };

  if (id && id !== 'new') {
    const { error } = await supabase.from('songs').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('songs').insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/songs');
  redirect('/admin/songs');
}

export async function deleteSong(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/songs');
  redirect('/admin/songs');
}
