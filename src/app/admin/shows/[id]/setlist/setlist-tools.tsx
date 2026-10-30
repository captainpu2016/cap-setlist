'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { copySetlist, importSetlist, previewSetlistImport, type ImportRow } from '../../actions';

export interface OtherShow {
  id: string;
  title: string;
  show_date: string;
  songCount: number;
}

export default function SetlistTools({ showId, otherShows }: { showId: string; otherShows: OtherShow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [sourceId, setSourceId] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function run(fn: () => Promise<string>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const done = await fn();
        setMessage({ kind: 'ok', text: done });
        router.refresh();
      } catch (e) {
        setMessage({ kind: 'error', text: e instanceof Error ? e.message : '操作失敗' });
      }
    });
  }

  function handlePreview() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await previewSetlistImport(text);
        setRows(result);
        if (result.length === 0) setMessage({ kind: 'error', text: '沒有解析到任何歌名' });
      } catch (e) {
        setMessage({ kind: 'error', text: e instanceof Error ? e.message : '預覽失敗' });
      }
    });
  }

  const newCount = rows ? new Set(rows.filter((r) => !r.placeholder && !r.songId).map((r) => r.title)).size : 0;
  const modeLabel = (
    <div className="flex gap-4 text-sm text-stone-700">
      <label className="flex items-center gap-1.5">
        <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} /> 接在現有歌單後面
      </label>
      <label className="flex items-center gap-1.5">
        <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> 取代現有歌單
      </label>
    </div>
  );

  return (
    <section className="mt-8 space-y-3">
      <details className="rounded-lg border border-stone-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-900">貼上文字批次匯入歌單</summary>
        <div className="space-y-3 border-t border-stone-100 p-4">
          <p className="text-xs text-stone-500">
            一行一首歌，開頭的序號（1. / 02、）會自動去掉。找不到的歌會在確認後自動新增到歌曲資料庫；寫「敬請期待」會變成占位。
          </p>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setRows(null);
            }}
            rows={8}
            placeholder={'1. 打氣歌\n2. 短褲精神\n3. 重新出發'}
            className="admin-input font-mono"
          />
          <button type="button" onClick={handlePreview} disabled={isPending || !text.trim()} className="admin-btn-secondary">
            預覽比對結果
          </button>

          {rows && rows.length > 0 && (
            <div className="space-y-3">
              <ol className="max-h-72 divide-y divide-stone-100 overflow-auto rounded-md border border-stone-200 text-sm">
                {rows.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <span className="min-w-0 truncate">
                      <span className="mr-2 text-stone-400">{String(i + 1).padStart(2, '0')}</span>
                      {r.title}
                    </span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                        r.placeholder
                          ? 'bg-stone-100 text-stone-500'
                          : r.songId
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.placeholder ? '占位' : r.songId ? '已有歌曲' : '將新增'}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-stone-500">
                共 {rows.length} 首{newCount > 0 ? `，其中 ${newCount} 首是資料庫沒有的新歌，確認後會一併建立` : ''}。
              </p>
              {modeLabel}
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (mode === 'replace' && !window.confirm('這會清空這場原有的歌單，確定要取代嗎？')) return;
                  run(async () => {
                    const r = await importSetlist(showId, rows, mode);
                    setText('');
                    setRows(null);
                    return `已匯入 ${r.imported} 首${r.createdSongs ? `（新增 ${r.createdSongs} 首歌曲）` : ''}`;
                  });
                }}
                className="admin-btn"
              >
                確認匯入
              </button>
            </div>
          )}
        </div>
      </details>

      <details className="rounded-lg border border-stone-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-900">複製其他場次的歌單</summary>
        <div className="space-y-3 border-t border-stone-100 p-4">
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="admin-input">
            <option value="">選擇要複製的場次…</option>
            {otherShows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.show_date}　{s.title}（{s.songCount} 首）
              </option>
            ))}
          </select>
          {modeLabel}
          <button
            type="button"
            disabled={isPending || !sourceId}
            onClick={() => {
              if (mode === 'replace' && !window.confirm('這會清空這場原有的歌單，確定要取代嗎？')) return;
              run(async () => {
                const r = await copySetlist(showId, sourceId, mode);
                return `已複製 ${r.copied} 首`;
              });
            }}
            className="admin-btn"
          >
            複製歌單
          </button>
        </div>
      </details>

      {message && (
        <p className={`text-sm ${message.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
    </section>
  );
}
