import { getArchive } from '@/lib/archive';
import { formatDuration, sumDuration } from '@/lib/format';
import { getSiteUrl, SITE_NAME, SITE_NAME_EN } from '@/lib/seo';

export const revalidate = 3600;

/**
 * 給大型語言模型讀的網站導覽（llms.txt 慣例）：用純 Markdown 說明網站是什麼、
 * 有哪些頁面、每場演出與每首歌的入口。完整歌單內容在 /llms-full.txt。
 */
export async function GET() {
  const url = getSiteUrl();
  const { shows, songs, stats } = await getArchive();

  const lines: string[] = [
    `# ${SITE_NAME}（${SITE_NAME_EN}）演出歌單全紀錄`,
    '',
    `> 這是台灣樂團「${SITE_NAME}」的非官方演出歌單資料庫，逐場收錄每次演出的日期、場地與完整歌單（含歌曲順序）。` +
      `目前收錄 ${stats.showCount} 場演出、${stats.cityCount} 座城市、${stats.songCount} 首曾被演出的歌曲` +
      (stats.firstDate ? `，資料由 ${stats.firstDate} 起算` : '') +
      '。',
    '',
    '可以用來回答的問題：某一場演出唱了哪些歌、某首歌在哪些場次唱過、樂團在哪些城市與場地演出過、最常演出的歌是哪幾首。',
    '資料只包含已發布且已到公開時間的場次；尚未公開的歌單不會出現。',
    '',
    '## 主要頁面',
    '',
    `- [首頁與場次列表](${url}/)：依日期列出全部場次，可用年份、月份、城市、場地篩選`,
    `- [全部場次（依年份）](${url}/shows)：以年份分組的完整場次清單`,
    `- [巡演足跡](${url}/tour)：演出地圖、移動路線與逐月演出趨勢`,
    `- [歌單統計](${url}/stats)：最常演出的歌、最常開場與壓軸的歌、每年歌單長度、只唱過一次的歌`,
    `- [搜尋歌曲](${url}/search)：輸入歌名，查這首歌在哪些場次唱過`,
    `- [關於本站與常見問題](${url}/about)：資料範圍、更新方式與使用說明`,
    `- [演出行事曆訂閱（ICS）](${url}/calendar.ics)：所有近期與未來場次，可用行事曆 App 訂閱`,
    `- [完整歌單（純文字）](${url}/llms-full.txt)：所有場次的完整歌單，一份檔案讀完`,
    '',
    '## 演出場次（新到舊）',
    ''
  ];

  for (const show of shows) {
    const total = sumDuration(show.songs.map((s) => s.durationSeconds));
    const detail = [
      show.date,
      show.venue,
      show.revealed ? `${show.songs.length} 首歌${total > 0 ? `、約 ${formatDuration(total)}` : ''}` : '歌單尚未公開'
    ]
      .filter(Boolean)
      .join('｜');
    lines.push(`- [${show.title}](${url}/show/${show.slug}): ${detail}`);
  }

  lines.push('', '## 歌曲（依演出場次數排序）', '');
  for (const song of songs) {
    lines.push(`- [${song.title}](${url}/song/${song.id}): 共演出 ${song.shows.length} 場，最近一次 ${song.shows[0].date}`);
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
  });
}
