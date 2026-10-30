import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

/** 明確歡迎的 AI 搜尋／引用爬蟲：公開內容都允許，後台、API 與圖卡產生端點不開放 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot'
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const disallow = ['/admin', '/api', '/show/*/card'];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow }))
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
