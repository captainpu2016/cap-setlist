import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { UUID, clientIp, hashDevice, jsonError, rateLimited, sameOrigin } from '@/lib/comment-guard';

/** 累積幾個不同裝置檢舉就先自動隱藏（後台可以恢復） */
const AUTO_HIDE_AT = 3;

/** POST /api/comments/[id]/report  body: { deviceId } */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!sameOrigin(request)) return jsonError('來源不被允許', 403);
  if (rateLimited(`report:${clientIp(request)}`, 10, 60_000)) return jsonError('操作太頻繁，請稍後再試。', 429);
  if (!UUID.test(params.id)) return jsonError('留言不存在', 404);

  let deviceId = '';
  try {
    const body = await request.json();
    deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : '';
  } catch {
    // 忽略
  }
  if (!UUID.test(deviceId)) return jsonError('缺少有效的裝置代碼', 400);

  const admin = createAdminClient();
  const { data: comment } = await admin
    .from('show_comments')
    .select('id, show_id')
    .eq('id', params.id)
    .maybeSingle<{ id: string; show_id: string }>();
  if (!comment) return jsonError('留言不存在', 404);

  // 同一裝置只能檢舉一次；重複檢舉（主鍵衝突）不算錯誤
  const { error } = await admin.from('show_comment_reports').insert({ comment_id: comment.id, device_hash: hashDevice(deviceId) });
  if (error && error.code !== '23505') {
    // eslint-disable-next-line no-console
    console.error('[report] 寫入失敗', error);
    return jsonError('檢舉失敗，請稍後再試。', 500);
  }

  const { count } = await admin
    .from('show_comment_reports')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', comment.id);
  const total = count ?? 0;

  await admin
    .from('show_comments')
    .update({ report_count: total, ...(total >= AUTO_HIDE_AT ? { status: 'hidden' as const } : {}) })
    .eq('id', comment.id);

  if (total >= AUTO_HIDE_AT) {
    const { data: show } = await admin.from('shows').select('slug').eq('id', comment.show_id).maybeSingle<{ slug: string }>();
    if (show) revalidatePath(`/show/${show.slug}`);
  }

  return NextResponse.json({ ok: true });
}
