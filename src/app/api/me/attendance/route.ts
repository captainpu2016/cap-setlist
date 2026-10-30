import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hits = new Map<string, number[]>();

/**
 * POST /api/me/attendance  body: { deviceId }
 * 回傳這個裝置回報過參與的場次 id。裝置代碼放在 body（不放網址），
 * 而且代碼是隨機 UUID、只存在使用者自己的瀏覽器裡。
 */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 30) return NextResponse.json({ error: '操作太頻繁，請稍後再試。' }, { status: 429 });
  recent.push(now);
  hits.set(ip, recent);

  let deviceId = '';
  try {
    const body = await request.json();
    deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : '';
  } catch {
    // 忽略
  }
  if (!UUID.test(deviceId)) return NextResponse.json({ error: '缺少有效的裝置代碼' }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from('show_attendances')
    .select('show_id')
    .eq('device_id', deviceId)
    .returns<{ show_id: string }[]>();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[me/attendance]', error);
    return NextResponse.json({ error: '讀取失敗，請稍後再試。' }, { status: 500 });
  }

  return NextResponse.json(
    { showIds: (data ?? []).map((r) => r.show_id) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
