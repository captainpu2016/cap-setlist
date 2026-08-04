import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/shows/[id]/attend
 * 公開端點（訪客不用登入），用 service role 存取，前端完全碰不到資料表本身。
 * body: { deviceId: string }
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  let deviceId: string | undefined;
  try {
    const body = await request.json();
    deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : undefined;
  } catch {
    // body 解析失敗就當作沒有 deviceId 處理
  }

  if (!deviceId || deviceId.length < 8 || deviceId.length > 100) {
    return NextResponse.json({ error: '缺少有效的裝置代碼' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: insertError } = await admin
    .from('show_attendances')
    .insert({ show_id: params.id, device_id: deviceId });

  // 23505 = unique constraint 衝突，代表這個裝置已經回報過了，不算錯誤，照樣回傳目前總數即可
  if (insertError && insertError.code !== '23505') {
    // eslint-disable-next-line no-console
    console.error('[attend] 寫入失敗', insertError);
    return NextResponse.json({ error: '回報失敗，請稍後再試。' }, { status: 500 });
  }

  const { count, error: countError } = await admin
    .from('show_attendances')
    .select('*', { count: 'exact', head: true })
    .eq('show_id', params.id);

  if (countError) {
    // eslint-disable-next-line no-console
    console.error('[attend] 計算人數失敗', countError);
    return NextResponse.json({ error: '讀取人數失敗，請稍後再試。' }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0, alreadyAttended: Boolean(insertError) });
}
