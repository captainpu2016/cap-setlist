import { createClient } from '@/lib/supabase/server';
import type { Show } from '@/types/database';
import { getSiteContent } from '@/lib/site-settings';
import ShowListSection from './show-list-section';
import CaptainBadge from '@/components/CaptainBadge';
import SiteLogo from '@/components/SiteLogo';

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: shows }, content] = await Promise.all([
    supabase
      .from('shows')
      .select('*')
      .eq('status', 'published')
      .order('show_date', { ascending: false })
      .returns<Show[]>(),
    getSiteContent()
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (shows ?? []).filter((s) => s.show_date >= today).reverse();
  const past = (shows ?? []).filter((s) => s.show_date < today);

  return (
    <main className="min-h-screen bg-noise bg-halftone">
      <header className="relative border-b border-stage-700/60 px-6 py-14 sm:px-10">
        <div className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-sm uppercase tracking-[0.3em] text-marquee">{content.eyebrow}</p>
            <h1 className="mt-4">
              <span className="sr-only">普通隊長</span>
              <SiteLogo height={72} className="sm:!h-24" />
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-400">{content.tagline}</p>
            {(shows ?? []).length > 0 && (
              <p className="mt-6 text-xs uppercase tracking-widest text-stone-600">
                共 {(shows ?? []).length} 場演出紀錄
              </p>
            )}
          </div>
          <CaptainBadge size={110} rotate={-3} className="mr-1 shadow-lg shadow-black/40 sm:mr-4" />
        </div>
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
