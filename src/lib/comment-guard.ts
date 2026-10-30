import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hits = new Map<string, number[]>();

/** 同一個伺服器實例內的簡易速率限制（依 key）；跨實例的限制靠資料庫查詢 */
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return false;
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** 只接受來自本站頁面的請求 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** 把裝置代碼雜湊後再存：資料庫公開可讀的欄位裡不放原始代碼 */
export function hashDevice(deviceId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-secret';
  return createHmac('sha256', secret).update(deviceId).digest('hex').slice(0, 40);
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const URL_LIKE = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|io|me|co|tw|cc|xyz|ly|gg|tv|link|click|top)\b)/i;

/** 留言內容檢查：不能有網址、不能全是空白或重複字元洗版 */
export function validateCommentBody(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: '請輸入留言內容' };
  // 去掉控制字元，連續空白壓成一個
  const body = raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (body.length < 1) return { ok: false, error: '請輸入留言內容' };
  if (body.length > 200) return { ok: false, error: '留言最多 200 字' };
  if (URL_LIKE.test(body)) return { ok: false, error: '為了避免垃圾訊息，留言裡不能放網址。' };
  if (/(.)\1{14,}/u.test(body)) return { ok: false, error: '留言內容看起來像洗版，請換個寫法。' };
  return { ok: true, body };
}

export function cleanNickname(raw: unknown): string {
  if (typeof raw !== 'string') return '匿名歌迷';
  const n = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return n && !URL_LIKE.test(n) ? n : '匿名歌迷';
}
