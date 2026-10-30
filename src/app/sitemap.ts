import type { MetadataRoute } from 'next';
import { getArchive } from '@/lib/archive';
import { getSiteUrl } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const { shows, songs, stats } = await getArchive();
  const lastModified = stats.lastUpdated || undefined;

  const showEntries: MetadataRoute.Sitemap = shows.map((show) => ({
    url: `${siteUrl}/show/${show.slug}`,
    lastModified: show.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7
  }));

  const songEntries: MetadataRoute.Sitemap = songs.map((song) => ({
    url: `${siteUrl}/song/${song.id}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.5
  }));

  return [
    { url: siteUrl, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/shows`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/tour`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/stats`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/search`, lastModified, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    ...showEntries,
    ...songEntries
  ];
}
