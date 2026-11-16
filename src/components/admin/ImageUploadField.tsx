'use client';

import { useState } from 'react';

/** 在瀏覽器裡把圖片縮小：長邊不超過 maxEdge，JPEG 依序降品質直到不超過 maxBytes（PNG 只縮尺寸，保留透明） */
async function shrink(file: File, maxEdge: number, maxBytes: number, keepPng: boolean): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('瀏覽器不支援圖片處理');
  const png = keepPng && file.type === 'image/png';
  if (!png) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  const toBlob = (type: string, q?: number) =>
    new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('轉檔失敗'))), type, q));
  if (png) return toBlob('image/png');
  let blob = await toBlob('image/jpeg', 0.8);
  for (const q of [0.7, 0.6, 0.5, 0.4]) {
    if (blob.size <= maxBytes) break;
    blob = await toBlob('image/jpeg', q);
  }
  return blob;
}

const kb = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + ' MB' : Math.round(n / 1000) + ' KB');

/**
 * 圖片欄位：可以直接選檔案上傳（上傳前自動縮小），也可以手動貼網址。
 * 欄位本身還是一般的 <input name=…>，表單送出的方式不變。
 */
export default function ImageUploadField({
  id,
  name,
  label,
  defaultValue,
  hint,
  prefix,
  maxEdge = 1600,
  maxBytes = 450_000,
  keepPng = false,
  previewClassName = 'mt-3 h-32 w-full rounded-md border border-stone-200 object-cover',
  className
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string | null;
  hint: string;
  prefix: string;
  maxEdge?: number;
  maxBytes?: number;
  /** PNG 保留 PNG 格式（有透明背景的圖，例如 Logo） */
  keepPng?: boolean;
  previewClassName?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [status, setStatus] = useState<{ kind: 'busy' | 'ok' | 'error'; text: string } | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: 'busy', text: '縮小並上傳中…' });
    try {
      const blob = await shrink(file, maxEdge, maxBytes, keepPng);
      const form = new FormData();
      form.append('file', new File([blob], 'upload', { type: blob.type }));
      form.append('prefix', prefix);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !json?.url) throw new Error(json?.error ?? '上傳失敗');
      setValue(json.url);
      setStatus({ kind: 'ok', text: `已上傳（${kb(file.size)} → ${kb(blob.size)}）。記得按下方的儲存，網址才會寫進去。` });
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : '上傳失敗' });
    }
  }

  return (
    <div className={className}>
      <label className="admin-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="admin-input"
        placeholder="選擇檔案上傳，或直接貼上圖片網址"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="admin-btn-secondary cursor-pointer text-xs">
          選擇圖片並上傳
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={status?.kind === 'busy'}
            onChange={(e) => {
              void onPick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {value && (
          <button type="button" onClick={() => setValue('')} className="text-xs text-stone-500 underline">
            清除
          </button>
        )}
        {status && (
          <span className={'text-xs ' + (status.kind === 'error' ? 'text-red-600' : status.kind === 'ok' ? 'text-green-700' : 'text-stone-500')}>
            {status.text}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-stone-400">{hint}</p>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="圖片預覽" className={previewClassName} />
      )}
    </div>
  );
}
