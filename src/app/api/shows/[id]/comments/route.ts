import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { todayTaipei } from '@/lib/format';
import { UUID, cleanNickname, clientIp, hashDevice, jsonError, rateLimited, sameOrigin, validateCommentBody } from '@/lib/comment-guard';

/**
 * POST /api/shows/[id]/comments  body: { deviceId, nickname?, body, website? }
 * 訪客留言（不用登入）。通過檢查就直接顯示（先發後審），後台可以隱藏。
 * `website` 是給機器人填的隱藏欄位（honeypot），有值就假裝成功但不寫入。
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!sameOrigin(request)) return jsonError('來源不被允許', 403);
  if (rateLimited(`comment:${clientIp(request)}`, 5, 60_000)) return jsonError('留言太頻繁，請稍後再試。', 429);
  if (!UUID.test(params.id)) return jsonError('場次不存在', 404);

  let payload: { deviceId?: unknown; nickname?: unknown; body?: unknown; website?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonError('資料格式錯誤', 400);
  }

  if (typeof payload.website === 'string' && payload.website.trim() !== '') {
    return NextResponse.json({ ok: true, comment: null });
  }

  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId.trim() : '';
  if (!UUID.test(deviceId)) return jsonError('缺少有效的裝置代碼', 400);

  const checked = validateCommentBody(payload.body);
  if (!checked.ok) return jsonError(checked.error, 400);
  const nickname = cleanNickname(payload.nickname);
  const deviceHash = hashDevice(deviceId);

  const admin = createAdminClient();
  const { data: show } = await admin
    .from('shows')
    .select('id, slug, status, show_date')
    .eq('id', params.id)
    .maybeSingle<{ id: string; slug: string; status: string; show_date: string }>();
  if (!show || show.status !== 'published') return jsonError('場次不存在', 404);
  if (show.show_date > todayTaipei()) return jsonError('這場演出還沒開始，開演後再來留言吧。', 400);

  // 跨實例的限制：同一裝置 10 分鐘最多 3 則、一天最多 10 則；同樣內容一天內不能重複送
  const tenMinAgo = new Date(Date.now() - 600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: recent }, { count: today }, { count: dup }] = await Promise.all([
    admin.from('show_comments').select('*', { count: 'exact', head: true }).eq('device_hash', deviceHash).gte('created_at', tenMinAgo),
    admin.from('show_comments').select('*', { count: 'exact', head: true }).eq('device_hash', deviceHash).gte('created_at', dayAgo),
    admin.from('show_comments').select('*', { count: 'exact', head: true }).eq('device_hash', deviceHash).eq('body', checked.body).gte('created_at', dayAgo)
  ]);
  if ((recent ?? 0) >= 3 || (today ?? 0) >= 10) return jsonError('留言太頻繁，請稍後再試。', 429);
  if ((dup ?? 0) > 0) return jsonError('你已經送過一樣的留言了。', 400);

  const { data, error } = await admin
    .from('show_comments')
    .insert({ show_id: show.id, nickname, body: checked.body, device_hash: deviceHash })
    .select('id, nickname, body, created_at')
    .single<{ id: string; nickname: string; body: string; created_at: string }>();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[comments] 寫入失敗', error);
    return jsonError('留言失敗，請稍後再試。', 500);
  }

  revalidatePath(`/show/${show.slug}`);
  return NextResponse.json({ ok: true, comment: data });
}
