import { createPublicClient } from '@/lib/supabase/public';
import { buildCalendar, type IcsEvent } from '@/lib/ics';
import { getSiteUrl } from '@/lib/seo';
import type { Show } from '@/types/database';

export const revalidate = 3600;

/**
 * 演出行事曆訂閱（ICS feed）：包含近 60 天內與之後所有已發布的場次。
 * 歌迷用 webcal:// 訂閱一次，之後新增或修改的場次會自動同步到他們的行事曆。
 */
export async function GET() {
  const url = getSiteUrl();
  const since = new Date(Date.now() - 60 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });

  const { data } = await createPublicClient()
    .from('shows')
    .select('*')
    .eq('status', 'published')
    .gte('show_date', since)
    .order('show_date', { ascending: true })
    .returns<Show[]>();

  const events: IcsEvent[] = (data ?? []).map((s) => ({
    uid: `show-${s.id}@${new URL(url).host}`,
    title: s.title,
    date: s.show_date,
    startTime: s.start_time,
    venue: s.venue,
    description: [s.ticket_url ? `購票：${s.ticket_url}` : null, `演出資訊與歌單：${url}/show/${s.slug}`].filter(Boolean).join('\n'),
    url: `${url}/show/${s.slug}`,
    updatedAt: s.updated_at
  }));

  return new Response(buildCalendar('普通隊長 演出', events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
