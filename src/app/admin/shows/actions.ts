'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/format';

async function requireSession() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return supabase;
}

export async function createShow(formData: FormData) {
  const supabase = await requireSession();

  const title = (formData.get('title') as string)?.trim();
  const showDate = formData.get('show_date') as string;
  const venue = (formData.get('venue') as string)?.trim() || null;
  let slug = (formData.get('slug') as string)?.trim();

  if (!title || !showDate) throw new Error('場次名稱與日期為必填');
  if (!slug) slug = slugify(title);

  const { data, error } = await supabase
    .from('shows')
    .insert({ title, show_date: showDate, venue, slug, status: 'draft' })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/admin/shows');
  redirect(`/admin/shows/${data.id}/setlist`);
}

export async function updateShowInfo(formData: FormData) {
  const supabase = await requireSession();

  const id = formData.get('id') as string;
  const title = (formData.get('title') as string)?.trim();
  const showDate = formData.get('show_date') as string;
  const venue = (formData.get('venue') as string)?.trim() || null;
  const slug = (formData.get('slug') as string)?.trim();
  const status = formData.get('status') as 'draft' | 'published';
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null;

  if (!title || !showDate || !slug) throw new Error('場次名稱、日期、slug 為必填');

  const { error } = await supabase
    .from('shows')
    .update({ title, show_date: showDate, venue, slug, status })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/shows');
  revalidatePath(`/admin/shows/${id}/setlist`);
  revalidatePath(`/show/${slug}`);
}

export async function deleteShow(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const { error } = await supabase.from('shows').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/shows');
  redirect('/admin/shows');
}

// ---------------------------------------------------------------------
// 歌單項目
// ---------------------------------------------------------------------

export async function addSetlistItem(formData: FormData) {
  const supabase = await requireSession();

  const showId = formData.get('show_id') as string;
  const songId = formData.get('song_id') as string | null;
  const isPlaceholder = formData.get('is_placeholder') === '1';

  const { data: existing } = await supabase
    .from('setlist_items')
    .select('position')
    .eq('show_id', showId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from('setlist_items').insert({
    show_id: showId,
    song_id: isPlaceholder ? null : songId,
    is_placeholder: isPlaceholder,
    position: nextPosition
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shows/${showId}/setlist`);
}

export async function removeSetlistItem(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const showId = formData.get('show_id') as string;

  const { error } = await supabase.from('setlist_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shows/${showId}/setlist`);
}

export async function updateSetlistItemNotes(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const showId = formData.get('show_id') as string;
  const notes = (formData.get('notes') as string)?.trim() || null;

  const { error } = await supabase.from('setlist_items').update({ notes }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shows/${showId}/setlist`);
}

/** 拖曳排序後，前端把新的順序（item id 陣列）一次送過來覆寫 position */
export async function reorderSetlistItems(showId: string, orderedIds: string[]) {
  'use server';
  const supabase = await requireSession();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('setlist_items').update({ position: index }).eq('id', id)
    )
  );

  revalidatePath(`/admin/shows/${showId}/setlist`);
}
