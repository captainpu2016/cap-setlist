'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireSession() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return supabase;
}

export async function upsertAlbum(formData: FormData) {
  const supabase = await requireSession();

  const id = formData.get('id') as string;
  const title = (formData.get('title') as string)?.trim();
  const releaseDate = (formData.get('release_date') as string)?.trim() || null;
  const isCover = formData.get('is_cover') === '1';

  if (!title) throw new Error('專輯名稱為必填');

  const payload = { title, release_date: releaseDate, is_cover: isCover };

  if (id && id !== 'new') {
    const { error } = await supabase.from('albums').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('albums').insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/albums');
  revalidatePath('/admin/songs');
  redirect('/admin/albums');
}

export async function deleteAlbum(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  // 刪除專輯不會刪歌曲，songs.album_id 會因為 FK 設定 on delete set null 自動變回「未分類」
  const { error } = await supabase.from('albums').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/albums');
  revalidatePath('/admin/songs');
  redirect('/admin/albums');
}
