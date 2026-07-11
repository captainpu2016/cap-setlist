import { createClient } from '@/lib/supabase/server';
import type { Show } from '@/types/database';
import ShowListSection from './show-list-section';

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createClient();
  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .eq('status', 'published')
    .order('show_date', { ascending: false })
    .returns<Show[]>();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (shows ?? []).filter((s) => s.show_date >= today).reverse();
  const past = (shows ?? []).filter((s) => s.show_date < today);

  return (
    <main className="min-h-screen bg-noise">
      <header className="border-b border-stage-700/60 px-6 py-14 sm:px-10">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-marquee">Setlist Archive</p>
        <h1 className="mt-3 font-display text-4xl font-black leading-tight text-paper sm:text-6xl">
          普通隊長
          <span className="block text-2xl font-normal text-stone-400 sm:text-3xl">演出場次與歌單</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-400">
          瀏覽每一場演出的完整歌單，找到當天播了哪些歌，並可一鍵生成同名 Spotify 播放清單。
        </p>
        {(shows ?? []).length > 0 && (
          <p className="mt-6 text-xs uppercase tracking-widest text-stone-600">
            共 {(shows ?? []).length} 場演出紀錄
          </p>
        )}
      </header>

      <section className="px-6 py-10 sm:px-10">
        {upcoming.length > 0 && <ShowListSection title="近期場次" shows={upcoming} accent />}
        <ShowListSection title="歷史場次" shows={past} collapsible />

        {(shows ?? []).length === 0 && (
          <p className="py-20 text-center text-stone-500">目前還沒有上架的場次，敬請期待。</p>
        )}
      </section>
    </main>
  );
}