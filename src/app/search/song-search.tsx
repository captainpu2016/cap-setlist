'use client';

import { useMemo, useState } from 'react';

export interface SearchSong {
  id: string;
  title: string;
  album: string | null;
  shows: { id: string; slug: string; title: string; date: string; venue: string | null }[];
}

type SortKey = 'count' | 'recent' | 'title';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'count', label: '常唱' },
  { key: 'recent', label: '最近唱' },
  { key: 'title', label: '歌名' }
];

const PAGE_SIZE = 30;

function formatDate(date: string) {
  const [y, m, d] = date.split('-');
  return `${y}.${m}.${d}`;
}

/** 把符合關鍵字的部分用 <mark> 標出來 */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let idx = lower.indexOf(q, from);
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark key={idx} className="rounded-sm bg-signal px-0.5 text-paper">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    from = idx + q.length;
    idx = lower.indexOf(q, from);
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

export default function SongSearch({ songs, initialQuery }: { songs: SearchSong[]; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>('count');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE_SIZE);

  const q = query.trim();

  const results = useMemo(() => {
    const list = q ? songs.filter((s) => s.title.toLowerCase().includes(q.toLowerCase())) : songs.slice();
    list.sort((a, b) => {
      if (sort === 'count') return b.shows.length - a.shows.length || a.title.localeCompare(b.title, 'zh-Hant');
      if (sort === 'recent') return b.shows[0].date.localeCompare(a.shows[0].date);
      return a.title.localeCompare(b.title, 'zh-Hant');
    });
    return list;
  }, [songs, q, sort]);

  function updateQuery(value: string) {
    setQuery(value);
    setLimit(PAGE_SIZE);
    // 同步到網址，方便分享搜尋結果
    const url = value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : '/search';
    window.history.replaceState(null, '', url);
  }

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visible = results.slice(0, limit);
  const maxCount = Math.max(1, ...songs.map((s) => s.shows.length));

  return (
    <div className="mt-8">
      {/* 搜尋框 */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          placeholder="輸入歌名關鍵字…"
          autoFocus
          aria-label="搜尋歌曲"
          className="w-full rounded-sm border-2 border-stage-700 bg-stage-900 py-4 pl-12 pr-12 text-base font-medium text-paper placeholder:text-stone-600 focus:border-signal focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => updateQuery('')}
            aria-label="清除搜尋"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-500 transition hover:bg-stage-700 hover:text-paper"
          >
            ✕
          </button>
        )}
      </div>

      {/* 結果數量與排序 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          {q ? (
            <>
              找到 <span className="font-bold text-marquee">{results.length}</span> 首符合「{q}」的歌曲
            </>
          ) : (
            <>
              共 <span className="font-bold text-marquee">{songs.length}</span> 首歌曲
            </>
          )}
        </p>
        <div className="flex gap-1 rounded-sm border border-stage-700 bg-stage-900 p-1" role="group" aria-label="排序">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              aria-pressed={sort === s.key}
              className={`rounded-sm px-3 py-1 text-xs transition ${
                sort === s.key ? 'bg-signal font-bold text-paper' : 'text-stone-400 hover:text-paper'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 歌曲列表 */}
      <ul className="mt-4 space-y-3">
        {visible.map((song) => {
          const isOpen = open.has(song.id) || results.length === 1;
          const panelId = `shows-${song.id}`;
          return (
            <li
              key={song.id}
              className="card-bar overflow-hidden pl-1"
            >
              <button
                type="button"
                onClick={() => toggle(song.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-stage-800/50"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-sm bg-stage-950 font-accent">
                  <span className="text-2xl font-bold leading-none text-paper">{song.shows.length}</span>
                  <span className="mt-0.5 text-[10px] tracking-widest text-signal">SHOWS</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-black text-paper">
                    <Highlight text={song.title} query={q} />
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-stone-500">
                    {song.album ? `${song.album}・` : ''}最近一次 {formatDate(song.shows[0].date)}
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-stage-700/60" aria-hidden>
                    <div
                      className="h-full rounded-full bg-signal"
                      style={{ width: `${(song.shows.length / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
                <svg
                  className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isOpen && (
                <ul id={panelId} className="max-h-80 divide-y divide-stage-700/70 overflow-y-auto border-t border-stage-700 bg-stage-950/40">
                  {song.shows.map((show) => (
                    <li key={show.id}>
                      <a
                        href={`/show/${show.slug}`}
                        className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-stage-800/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-paper">{show.title}</span>
                          {show.venue && <span className="block truncate text-xs text-stone-500">{show.venue}</span>}
                        </span>
                        <span className="shrink-0 font-accent text-xs tracking-wider text-stone-500">{formatDate(show.date)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {results.length > visible.length && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="mt-5 btn-ghost w-full !py-3"
        >
          顯示更多（還有 {results.length - visible.length} 首）
        </button>
      )}

      {q && results.length === 0 && (
        <div className="mt-10 rounded-sm border border-dashed border-stage-700 py-12 text-center">
          <p className="text-paper">沒有找到符合「{q}」的歌曲</p>
          <p className="mt-2 text-xs text-stone-500">試試看更短的關鍵字，或確認有沒有打錯字。</p>
        </div>
      )}
    </div>
  );
}
