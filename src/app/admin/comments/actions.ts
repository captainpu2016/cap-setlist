'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function requireSession() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return supabase;
}

async function refreshShowPage(supabase: Awaited<ReturnType<typeof requireSession>>, showId: string) {
  const { data } = await supabase.from('shows').select('slug').eq('id', showId).maybeSingle<{ slug: string }>();
  if (data) revalidatePath(`/show/${data.slug}`);
  revalidatePath('/admin/comments');
}

export async function setCommentStatus(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const status = formData.get('status') === 'hidden' ? 'hidden' : 'visible';
  const { data, error } = await supabase
    .from('show_comments')
    .update({ status })
    .eq('id', id)
    .select('show_id')
    .single<{ show_id: string }>();
  if (error) throw new Error(error.message);
  await refreshShowPage(supabase, data.show_id);
}

export async function deleteComment(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const { data: row } = await supabase.from('show_comments').select('show_id').eq('id', id).maybeSingle<{ show_id: string }>();
  const { error } = await supabase.from('show_comments').delete().eq('id', id);
  if (error) throw new Error(error.message);
  if (row) await refreshShowPage(supabase, row.show_id);
}
