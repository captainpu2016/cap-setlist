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

export async function updateSiteContent(formData: FormData) {
  const supabase = await requireSession();

  const eyebrow = (formData.get('eyebrow') as string)?.trim();
  const tagline = (formData.get('tagline') as string)?.trim();
  const bgImageUrl = (formData.get('bg_image_url') as string)?.trim();

  const { error } = await supabase.from('site_settings').upsert(
    [
      { key: 'homepage_eyebrow', value: eyebrow || null },
      { key: 'homepage_tagline', value: tagline || null },
      { key: 'homepage_bg_image_url', value: bgImageUrl || null }
    ],
    { onConflict: 'key' }
  );

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/admin/settings/site');
}
