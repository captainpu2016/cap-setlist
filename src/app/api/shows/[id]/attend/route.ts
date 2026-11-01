import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { todayTaipei } from '@/lib/format';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 同一個伺服器實例內的簡易速率限制（依 IP）；跨實例的總量限制靠下面的資料庫查詢 */
const hits = new Map<string, number[]>();
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  // 順手清掉太久沒用的紀錄，避免 Map 無限成長
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return false;
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** 只接受來自本站頁面的請求，擋掉別的網站或腳本直接打 API */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // 部分瀏覽器同源請求不帶 Origin
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function readDeviceId(request: Request): Promise<string | null> {
  try {
    const body = await request.json();
    const id = typeof body?.deviceId === 'string' ? body.deviceId.trim() : '';
    return UUID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** 共用檢查：來源、速率、裝置代碼、場次存在且已發布且已開演 */
async function guard(request: Request, showId: string) {
  if (!sameOrigin(request)) return { error: NextResponse.json({ error: '來源不被允許' }, { status: 403 }) };
  if (rateLimited(`attend:${clientIp(request)}`, 40, 60_000)) {
    return { error: NextResponse.json({ error: '操作太頻繁，請稍後再試。' }, { status: 429 }) };
  }
  if (!UUID.test(showId)) return { error: NextResponse.json({ error: '場次不存在' }, { status: 404 }) };

  const deviceId = await readDeviceId(request);
  if (!deviceId) return { error: NextResponse.json({ error: '缺少有效的裝置代碼' }, { status: 400 }) };

  const admin = createAdminClient();
  const { data: show } = await admin
    .from('shows')
    .select('id, status, show_date')
    .eq('id', showId)
    .maybeSingle<{ id: string; status: string; show_date: string }>();

  if (!show || show.status !== 'published') return { error: NextResponse.json({ error: '場次不存在' }, { status: 404 }) };
  // 還沒開演的場次不能回報參與，避免提前灌人數
  if (show.show_date > todayTaipei()) {
    return { error: NextResponse.json({ error: '這場演出還沒開始。' }, { status: 400 }) };
  }
  return { admin, deviceId };
}

async function countFor(admin: ReturnType<typeof createAdminClient>, showId: string) {
  const { count } = await admin
    .from('show_attendances')
    .select('*', { count: 'exact', head: true })
    .eq('show_id', showId);
  return count ?? 0;
}

/**
 * POST /api/shows/[id]/attend
 * 公開端點（訪客不用登入），用 service role 存取。body: { deviceId: UUID }
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const g = await guard(request, params.id);
  if ('error' in g) return g.error;
  const { admin, deviceId } = g;

  // 跨實例的總量限制：同一個裝置一小時內最多回報 300 場（要讓人一次補標完歷年場次）；同一場一分鐘內最多 120 筆新增
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const [{ count: deviceRecent }, { count: showRecent }] = await Promise.all([
    admin.from('show_attendances').select('*', { count: 'exact', head: true }).eq('device_id', deviceId).gte('created_at', hourAgo),
    admin.from('show_attendances').select('*', { count: 'exact', head: true }).eq('show_id', params.id).gte('created_at', minuteAgo)
  ]);
  if ((deviceRecent ?? 0) >= 300 || (showRecent ?? 0) >= 120) {
    return NextResponse.json({ error: '操作太頻繁，請稍後再試。' }, { status: 429 });
  }

  const { error: insertError } = await admin.from('show_attendances').insert({ show_id: params.id, device_id: deviceId });

  // 23505 = unique constraint 衝突，代表這個裝置已經回報過了，不算錯誤
  if (insertError && insertError.code !== '23505') {
    // eslint-disable-next-line no-console
    console.error('[attend] 寫入失敗', insertError);
    return NextResponse.json({ error: '回報失敗，請稍後再試。' }, { status: 500 });
  }

  return NextResponse.json({ count: await countFor(admin, params.id), alreadyAttended: Boolean(insertError) });
}

/** DELETE：取消自己的參與紀錄（只能刪除自己裝置代碼的那一筆） */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const g = await guard(request, params.id);
  if ('error' in g) return g.error;
  const { admin, deviceId } = g;

  const { error } = await admin.from('show_attendances').delete().eq('show_id', params.id).eq('device_id', deviceId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[attend] 取消失敗', error);
    return NextResponse.json({ error: '取消失敗，請稍後再試。' }, { status: 500 });
  }
  return NextResponse.json({ count: await countFor(admin, params.id) });
}
