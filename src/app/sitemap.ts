import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000';
  const supabase = createClient();

  const { data: shows } = await supabase
    .from('shows')
    .select('slug, updated_at')
    .eq('status', 'published')
    .returns<{ slug: string; updated_at: string }[]>();

  const showEntries: MetadataRoute.Sitemap = (shows ?? []).map((show) => ({
    url: `${siteUrl}/show/${show.slug}`,
    lastModified: show.updated_at,
    changeFrequency: 'monthly',
    priority: 0.7
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1
    },
    ...showEntries
  ];
}
