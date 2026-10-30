'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getDeviceId } from '@/lib/device-id';
import { canvasToBlob, drawRecapCard, shareOrDownload, type RecapData } from '@/lib/recap-card';

export interface MeShow {
  id: string;
  slug: string;
  title: string;
  date: string;
  venue: string | null;
  city: string | null;
  songs: { id: string; title: string }[];
}

export default function MeClient({ shows }: { shows: MeShow[] }) {
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const [filter, setFilter] = useState('');

  // 載入這個裝置回報過的場次；伺服器沒回應時退回本機記號
  useEffect(() => {
    const local = new Set(shows.filter((s) => window.localStorage.getItem(`ncap_attended_${s.id}`) === '1').map((s) => s.id));
    fetch('/api/me/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId() })
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: { showIds: string[] }) => {
        const ids = new Set([...local, ...json.showIds]);
        setAttended(new Set(shows.filter((s) => ids.has(s.id)).map((s) => s.id)));
      })
      .catch(() => setAttended(local))
      .finally(() => setReady(true));
  }, [shows]);

  async function toggle(show: MeShow) {
    if (busyId) return;
    setBusyId(show.id);
    setError(null);
    const has = attended.has(show.id);
    try {
      const res = await fetch(`/api/shows/${show.id}/attend`, {
        method: has ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? '操作失敗');
      setAttended((prev) => {
        const next = new Set(prev);
        if (has) next.delete(show.id);
        else next.add(show.id);
        return next;
      });
      if (has) window.localStorage.removeItem(`ncap_attended_${show.id}`);
      else window.localStorage.setItem(`ncap_attended_${show.id}`, '1');
      blobRef.current = null;
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗，請稍後再試。');
    } finally {
      setBusyId(null);
    }
  }

  const recap: RecapData | null = useMemo(() => {
    const mine = shows.filter((s) => attended.has(s.id)).sort((a, b) => a.date.localeCompare(b.date));
    if (mine.length === 0) return null;
    const counts = new Map<string, { title: string; count: number }>();
    let totalPlays = 0;
    for (const s of mine) {
      for (const song of s.songs) {
        totalPlays += 1;
        const e = counts.get(song.id) ?? { title: song.title, count: 0 };
        e.count += 1;
        counts.set(song.id, e);
      }
    }
    return {
      shows: mine.length,
      distinctSongs: counts.size,
      totalPlays,
      cities: new Set(mine.map((s) => s.city).filter(Boolean)).size,
      topSongs: Array.from(counts.values()).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh-Hant')),
      first: { title: mine[0].title, date: mine[0].date },
      latest: { title: mine[mine.length - 1].title, date: mine[mine.length - 1].date },
      domain: window.location.host
    };
  }, [shows, attended]);

  async function makeCard(): Promise<Blob | null> {
    if (!recap) return null;
    if (blobRef.current) return blobRef.current;
    const canvas = document.createElement('canvas');
    await drawRecapCard(canvas, recap);
    const blob = await canvasToBlob(canvas);
    blobRef.current = blob;
    setPreview(URL.createObjectURL(blob));
    return blob;
  }

  async function handleShare() {
    setMaking(true);
    setError(null);
    try {
      const blob = await makeCard();
      if (blob) await shareOrDownload(blob, '我的現場紀錄-普通隊長.png', '我的現場紀錄');
    } catch {
      setError('產生回顧卡失敗，請稍後再試。');
    } finally {
      setMaking(false);
    }
  }

  const visible = shows.filter((s) => {
    const q = filter.trim().toLowerCase();
    return !q || `${s.title} ${s.venue ?? ''} ${s.date}`.toLowerCase().includes(q);
  });

  return (
    <div className="mt-10">
      {ready && recap && (
        <section className="border-t-2 border-paper pt-6" aria-label="我的統計">
          <p className="font-accent text-2xl font-semibold text-paper">
            <span className="text-6xl font-bold text-marquee">{recap.shows}</span> 場演出
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-4 font-accent">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Songs</dt>
              <dd className="text-3xl font-bold text-paper">{recap.distinctSongs}</dd>
              <p className="text-xs text-stone-500">首不同的歌</p>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Plays</dt>
              <dd className="text-3xl font-bold text-paper">{recap.totalPlays}</dd>
              <p className="text-xs text-stone-500">首次現場聽到</p>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Cities</dt>
              <dd className="text-3xl font-bold text-paper">{recap.cities}</dd>
              <p className="text-xs text-stone-500">座城市</p>
            </div>
          </dl>
          {recap.topSongs[0] && (
            <p className="mt-5 text-sm text-stone-300">
              你聽過最多次的是〈{recap.topSongs[0].title}〉，現場聽了 {recap.topSongs[0].count} 次。
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleShare} disabled={making} className="btn-primary">
              {making ? '產生中…' : '產生並分享回顧卡'}
            </button>
            <button type="button" onClick={() => void makeCard()} disabled={making} className="btn-ghost">
              預覽
            </button>
          </div>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="我的現場紀錄回顧卡預覽" className="mt-6 w-full max-w-xs border-2 border-stage-700" />
          )}
          <p className="mt-4 text-xs text-stone-500">回顧卡在你的裝置上產生，你的參與紀錄只用來計算，不會公開。</p>
        </section>
      )}

      {ready && !recap && (
        <p className="border-t-2 border-paper pt-6 text-stone-300">
          還沒有標記任何場次。從下面的清單點「我去過」，就會開始累積你的現場紀錄。
        </p>
      )}

      {error && <p className="mt-4 text-sm text-signal">{error}</p>}

      <section className="mt-12">
        <h2 className="section-title mb-2 text-2xl">我去過哪幾場？</h2>
        <p className="mb-4 text-sm text-stone-500">標記後會算進場次的「我有參與」人數；之後可以隨時取消。</p>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜尋場次、場地或日期…"
          aria-label="搜尋場次"
          className="mb-4 w-full border-2 border-stage-700 bg-stage-900 px-4 py-3 text-sm text-paper placeholder:text-stone-600 focus:border-signal focus:outline-none"
        />
        <ul className="border-y border-stage-700">
          {visible.map((s) => {
            const on = attended.has(s.id);
            return (
              <li key={s.id} className="flex items-center justify-between gap-4 border-b border-stage-700/70 py-3 last:border-b-0">
                <a href={`/show/${s.slug}`} className="min-w-0 flex-1 hover:text-marquee">
                  <span className="block truncate text-sm text-paper">{s.title}</span>
                  <span className="block truncate text-xs text-stone-500">
                    {s.date.replace(/-/g, '.')}
                    {s.venue ? `・${s.venue}` : ''}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => void toggle(s)}
                  disabled={!ready || busyId === s.id}
                  aria-pressed={on}
                  className={`shrink-0 border-2 px-3 py-1.5 text-xs font-bold transition ${
                    on ? 'border-signal bg-signal text-paper' : 'border-stage-700 text-stone-300 hover:border-paper'
                  } disabled:opacity-50`}
                >
                  {on ? '✓ 我去過' : '我去過'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
