import { getArchive } from '@/lib/archive';
import { formatShowDate } from '@/lib/format';
import { getSiteUrl, SITE_NAME, SITE_NAME_EN } from '@/lib/seo';

export const revalidate = 3600;

/** 所有已公開場次的完整歌單，單一 Markdown 檔，方便 AI 一次讀完整個資料庫 */
export async function GET() {
  const url = getSiteUrl();
  const { shows, stats } = await getArchive();

  const out: string[] = [
    `# ${SITE_NAME}（${SITE_NAME_EN}）全部演出歌單`,
    '',
    `共 ${stats.showCount} 場演出。每場列出日期、場地與歌曲順序。來源：${url}`,
    ''
  ];

  for (const show of shows) {
    out.push(`## ${show.title}`, '');
    out.push(`- 日期：${formatShowDate(show.date)}（${show.date}）`);
    if (show.venue) out.push(`- 場地：${show.venue}`);
    out.push(`- 網址：${url}/show/${show.slug}`);
    if (!show.revealed) {
      out.push('- 歌單：尚未公開', '');
      continue;
    }
    if (show.songs.length === 0) {
      out.push('- 歌單：準備中', '');
      continue;
    }
    out.push(`- 歌曲數：${show.songs.length}`, '', '歌單：', '');
    show.songs.forEach((s, i) => out.push(`${i + 1}. ${s.title}`));
    out.push('');
  }

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
  });
}
