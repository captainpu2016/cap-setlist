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

export async function upsertVenue(formData: FormData) {
  const supabase = await requireSession();

  const id = formData.get('id') as string;
  const name = (formData.get('name') as string)?.trim();
  const city = (formData.get('city') as string)?.trim() || null;
  const latitudeRaw = formData.get('latitude') as string;
  const longitudeRaw = formData.get('longitude') as string;

  if (!name) throw new Error('場地名稱為必填');

  const payload = {
    name,
    city,
    latitude: latitudeRaw ? Number(latitudeRaw) : null,
    longitude: longitudeRaw ? Number(longitudeRaw) : null
  };

  if (id && id !== 'new') {
    const { error } = await supabase.from('venues').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('venues').insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/venues');
  revalidatePath('/admin/shows');
  redirect('/admin/venues');
}

export async function deleteVenue(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  // 刪除場地不會刪場次，shows.venue_id 會因為 FK 設定 on delete set null 自動變回「未指定」
  const { error } = await supabase.from('venues').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/venues');
  revalidatePath('/admin/shows');
  redirect('/admin/venues');
}
