'use client';

import { useMemo, useState } from 'react';
import { ADMISSIONS, SHOW_CATEGORIES } from '@/lib/show-category';
import { isIntroSong } from '@/lib/song-title';
import type { StatsShow } from './stats-view';

type Period = string; // 'all' 或 4 位數年份

interface Summary {
  shows: number;
  songs: number;
  cities: number;
  category: Map<string, number>;
  admission: Map<string, number>;
  region: Map<string, number>;
}

function summarize(shows: StatsShow[]): Summary {
  const songs = new Set<string>();
  const cities = new Set<string>();
  const category = new Map<string, number>();
  const admission = new Map<string, number>();
  const region = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const s of shows) {
    for (const x of s.songs) if (!isIntroSong(x.title)) songs.add(x.id);
    if (s.city) cities.add(s.city);
    bump(category, s.category ?? 'none');
    bump(admission, s.admission ?? 'none');
    bump(region, s.overseas ? 'overseas' : 'domestic');
  }
  return { shows: shows.length, songs: songs.size, cities: cities.size, category, admission, region };
}

const periodLabel = (p: Period) => (p === 'all' ? '全部' : `${p} 年`);

const COLOR_A = 'bg-stone-400';
const COLOR_B = 'bg-signal';

function Delta({ a, b, unit }: { a: number; b: number; unit: string }) {
  const d = b - a;
  if (d === 0) return <span className="text-stone-500">持平</span>;
  return (
    <span className={d > 0 ? 'text-marquee' : 'text-stone-400'}>
      {d > 0 ? '+' : '−'}
      {Math.abs(d)} {unit}
    </span>
  );
}

/** 一個維度（演出類型、入場方式…）：每個選項各畫兩條長條，百分比是「占該期全部場次」 */
function Distribution({
  title,
  rows,
  a,
  b,
  totalA,
  totalB
}: {
  title: string;
  rows: { key: string; label: string }[];
  a: Map<string, number>;
  b: Map<string, number>;
  totalA: number;
  totalB: number;
}) {
  const visible = rows.filter((r) => (a.get(r.key) ?? 0) > 0 || (b.get(r.key) ?? 0) > 0);
  if (visible.length === 0) return null;
  const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
  return (
    <div className="mt-8">
      <h3 className="font-accent text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">{title}</h3>
      <ul className="mt-3 divide-y divide-stage-700/70 border-y border-stage-700">
        {visible.map((r) => {
          const ca = a.get(r.key) ?? 0;
          const cb = b.get(r.key) ?? 0;
          const pa = pct(ca, totalA);
          const pb = pct(cb, totalB);
          return (
            <li key={r.key} className="grid items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_7rem]">
              <p className="font-bold text-paper">{r.label}</p>
              <div className="space-y-1.5">
                {[
                  { c: ca, p: pa, color: COLOR_A, key: 'a' },
                  { c: cb, p: pb, color: COLOR_B, key: 'b' }
                ].map((x) => (
                  <div key={x.key} className="flex items-center gap-3">
                    <div className="h-2.5 flex-1 bg-stage-800">
                      <div className={`h-full ${x.color}`} style={{ width: `${x.p}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-stone-300">
                      {x.c} 場・{x.p}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs tabular-nums sm:text-right">
                <Delta a={ca} b={cb} unit="場" />
                <span className="ml-2 text-stone-500">
                  {pb - pa > 0 ? '+' : pb - pa < 0 ? '−' : ''}
                  {Math.abs(pb - pa)} 點
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 年度比較：選兩個期間（年份或「全部」），並排比較場次數、歌曲數、城市數，以及演出類型、入場方式、國內外的比例。只算演出日期已過的場次。 */
export default function YearCompare({ shows, today }: { shows: StatsShow[]; today: string }) {
  const past = useMemo(() => shows.filter((s) => s.date <= today), [shows, today]);
  const years = useMemo(() => Array.from(new Set(past.map((s) => s.date.slice(0, 4)))).sort((x, y) => y.localeCompare(x)), [past]);
  const [a, setA] = useState<Period>(years[1] ?? 'all');
  const [b, setB] = useState<Period>(years[0] ?? 'all');

  const pick = (p: Period) => (p === 'all' ? past : past.filter((s) => s.date.startsWith(p)));
  const sa = useMemo(() => summarize(pick(a)), [past, a]); // eslint-disable-line react-hooks/exhaustive-deps
  const sb = useMemo(() => summarize(pick(b)), [past, b]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = [...years.map((y) => ({ value: y, label: `${y} 年` })), { value: 'all', label: '全部' }];
  const select = (value: Period, onChange: (v: Period) => void, color: string, name: string) => (
    <label className="flex items-center gap-2 text-sm text-stone-300">
      <span className={`inline-block h-3 w-3 ${color}`} aria-hidden />
      {name}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-2 border-stage-700 bg-stage-900 px-3 py-1.5 text-sm font-bold text-paper focus:border-signal focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  const stat = (label: string, va: number, vb: number, unit: string) => (
    <div className="border border-stage-700 p-4">
      <p className="font-accent text-[11px] uppercase tracking-[0.25em] text-stone-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3 tabular-nums">
        <span className="text-2xl font-bold text-stone-300">{va}</span>
        <span className="text-stone-600" aria-hidden>→</span>
        <span className="text-3xl font-bold text-paper">{vb}</span>
      </div>
      <p className="mt-1 text-right text-xs">
        <Delta a={va} b={vb} unit={unit} />
      </p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {select(a, setA, COLOR_A, '比較')}
        <span className="text-stone-600" aria-hidden>vs</span>
        {select(b, setB, COLOR_B, '對照')}
      </div>
      <p className="mt-3 text-xs text-stone-500">
        只算演出日期已過的場次；百分比是占該期全部場次的比例。差異是「{periodLabel(b)}」減去「{periodLabel(a)}」；「點」是百分比的差（百分點）。
      </p>

      {sa.shows + sb.shows === 0 ? (
        <p className="mt-6 text-sm text-stone-500">這兩個期間都還沒有場次。</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {stat('場次', sa.shows, sb.shows, '場')}
            {stat('不同的歌', sa.songs, sb.songs, '首')}
            {stat('城市', sa.cities, sb.cities, '座')}
          </div>

          <Distribution
            title="演出類型"
            rows={[...SHOW_CATEGORIES.map((c) => ({ key: c.value, label: c.label })), { key: 'none', label: '未分類' }]}
            a={sa.category}
            b={sb.category}
            totalA={sa.shows}
            totalB={sb.shows}
          />
          <Distribution
            title="入場方式"
            rows={[...ADMISSIONS.map((c) => ({ key: c.value, label: c.label })), { key: 'none', label: '未填' }]}
            a={sa.admission}
            b={sb.admission}
            totalA={sa.shows}
            totalB={sb.shows}
          />
          <Distribution
            title="國內／海外"
            rows={[
              { key: 'domestic', label: '台灣' },
              { key: 'overseas', label: '海外' }
            ]}
            a={sa.region}
            b={sb.region}
            totalA={sa.shows}
            totalB={sb.shows}
          />
        </>
      )}
    </div>
  );
}
