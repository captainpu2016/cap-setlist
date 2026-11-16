import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'picture';
const MAX_BYTES = 2_000_000; // 瀏覽器端會先壓縮；超過這個大小一律拒絕，避免再放進原始大圖
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** 後台上傳圖片：只有登入的管理員能用，檔案存到 Storage 並回傳可直接貼進欄位的網址。 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '請先登入後台。' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: '沒有收到檔案。' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: '只能上傳 JPG、PNG 或 WebP 圖片。' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: '圖片太大了（壓縮後仍超過 2 MB），請換一張或縮小尺寸。' }, { status: 413 });

  const prefix = String(form?.get('prefix') ?? 'img').replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'img';
  const path = `${prefix}-${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false
  });
  if (error) return NextResponse.json({ error: '上傳失敗：' + error.message }, { status: 500 });

  const { data, error: signError } = await admin.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signError || !data) return NextResponse.json({ error: '產生網址失敗。' }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, bytes: file.size });
}
