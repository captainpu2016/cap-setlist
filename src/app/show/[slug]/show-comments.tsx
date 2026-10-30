'use client';

import { useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/device-id';
import { toTaipeiInputValue } from '@/lib/format';

export interface CommentItem {
  id: string;
  nickname: string;
  body: string;
  created_at: string;
}

const NICK_KEY = 'ncap_comment_nickname';
const MAX = 200;

/** 用固定格式輸出台灣時間，伺服器與瀏覽器的結果才會一致（toLocaleString 兩邊格式可能不同，會造成 hydration 錯誤） */
function formatWhen(iso: string): string {
  return toTaipeiInputValue(iso).replace('T', ' ').replace(/-/g, '.');
}

export default function ShowComments({
  showId,
  initialComments,
  total,
  canComment
}: {
  showId: string;
  initialComments: CommentItem[];
  total: number;
  canComment: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [count, setCount] = useState(total);
  const [nickname, setNickname] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState(''); // honeypot：真人看不到也不會填
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      setNickname(window.localStorage.getItem(NICK_KEY) ?? '');
      const raw = window.localStorage.getItem('ncap_reported_comments');
      if (raw) setReported(new Set(JSON.parse(raw) as string[]));
    } catch {
      // localStorage 不可用就略過
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/shows/${showId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), nickname, body, website })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? '留言失敗，請稍後再試。');
      if (json.comment) {
        setComments((prev) => [json.comment as CommentItem, ...prev]);
        setCount((c) => c + 1);
      }
      setBody('');
      try {
        window.localStorage.setItem(NICK_KEY, nickname.trim());
      } catch {
        // 略過
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '留言失敗，請稍後再試。');
    } finally {
      setSending(false);
    }
  }

  async function report(id: string) {
    if (reported.has(id) || !window.confirm('要檢舉這則留言嗎？')) return;
    try {
      const res = await fetch(`/api/comments/${id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() })
      });
      if (!res.ok) throw new Error();
      const next = new Set(reported).add(id);
      setReported(next);
      try {
        window.localStorage.setItem('ncap_reported_comments', JSON.stringify(Array.from(next)));
      } catch {
        // 略過
      }
    } catch {
      window.alert('檢舉失敗，請稍後再試。');
    }
  }

  return (
    <section id="comments" className="mt-14 scroll-mt-20">
      <h2 className="section-title mb-4 text-2xl">
        現場留言 <span className="ml-1 font-accent text-base text-stone-500">{count}</span>
      </h2>

      {canComment ? (
        <form onSubmit={submit} className="border-2 border-stage-700 bg-stage-900 p-4">
          <label htmlFor="comment-body" className="sr-only">
            留言內容
          </label>
          <textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX}
            rows={3}
            placeholder="那天哪一首讓你最有感覺？留下你的現場回憶…"
            className="w-full resize-none border-2 border-stage-700 bg-stage-950 px-3 py-2 text-sm text-paper placeholder:text-stone-600 focus:border-signal focus:outline-none"
          />
          {/* honeypot：用 CSS 移出畫面，不用 display:none，讓機器人以為是正常欄位 */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label htmlFor="comment-nick" className="sr-only">
              暱稱
            </label>
            <input
              id="comment-nick"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="暱稱（選填）"
              className="w-40 border-2 border-stage-700 bg-stage-950 px-3 py-2 text-sm text-paper placeholder:text-stone-600 focus:border-signal focus:outline-none"
            />
            <span className={`text-xs ${body.length >= MAX ? 'text-signal' : 'text-stone-500'}`}>
              {body.length}/{MAX}
            </span>
            <button type="submit" disabled={sending || body.trim().length === 0} className="btn-primary ml-auto">
              {sending ? '送出中…' : '送出留言'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-signal">{error}</p>}
          <p className="mt-3 text-xs text-stone-600">留言會直接公開顯示，請不要放網址或個人資料；不適當的內容我們會隱藏。</p>
        </form>
      ) : (
        <p className="border-2 border-dashed border-stage-700 p-4 text-sm text-stone-500">演出開始後，這裡就可以留言了。</p>
      )}

      {comments.length > 0 ? (
        <ul className="mt-6 border-y border-stage-700">
          {comments.map((c) => (
            <li key={c.id} className="border-b border-stage-700/70 py-4 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-black text-paper">{c.nickname}</span>
                <time dateTime={c.created_at} className="shrink-0 font-accent text-xs tracking-wide text-stone-500">
                  {formatWhen(c.created_at)}
                </time>
              </div>
              <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-stone-300">{c.body}</p>
              <button
                type="button"
                onClick={() => void report(c.id)}
                disabled={reported.has(c.id)}
                className="mt-2 text-xs text-stone-600 transition hover:text-signal disabled:cursor-default disabled:hover:text-stone-600"
              >
                {reported.has(c.id) ? '已檢舉' : '檢舉'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        canComment && <p className="mt-6 text-sm text-stone-500">還沒有留言，當第一個留下回憶的人吧。</p>
      )}
    </section>
  );
}
