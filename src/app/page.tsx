import { createClient } from '@/lib/supabase/server';
import type { Show } from '@/types/database';
import { getSiteContent } from '@/lib/site-settings';
import ShowListSection from './show-list-section';
import SiteLogo from '@/components/SiteLogo';

export const revalidate = 60;

interface HomeSearchParams {
  year?: string;
  venue?: string;
}

export default async function HomePage({ searchParams }: { searchParams: HomeSearchParams }) {
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

  const allShows = shows ?? [];

  // 篩選選單的選項，一律從「全部」場次算出來，不會因為篩選結果變少而選項也跟著變少
  const years = Array.from(new Set(allShows.map((s) => s.show_date.slice(0, 4)))).sort((a, b) =>
    b.localeCompare(a)
  );
  const venues = Array.from(new Set(allShows.map((s) => s.venue).filter((v): v is string => Boolean(v)))).sort(
    (a, b) => a.localeCompare(b, 'zh-Hant')
  );

  const selectedYear = searchParams.year ?? '';
  const selectedVenue = searchParams.venue ?? '';
  const hasFilter = Boolean(selectedYear || selectedVenue);

  const filteredShows = allShows.filter((s) => {
    if (selectedYear && !s.show_date.startsWith(selectedYear)) return false;
    if (selectedVenue && s.venue !== selectedVenue) return false;
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = filteredShows.filter((s) => s.show_date >= today).reverse();
  const past = filteredShows.filter((s) => s.show_date < today);

  return (
    <main className="min-h-screen bg-noise bg-halftone">
      <header className="relative border-b border-stage-700/60 px-6 py-14 sm:px-10">
        {content.bgImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.bgImageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stage-950 via-stage-950/60 to-stage-950/10" />
          </>
        )}

        <div className="relative">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-marquee">{content.eyebrow}</p>
          <h1 className="mt-4">
            <span className="sr-only">普通隊長</span>
            <SiteLogo height={72} className="sm:!h-24" />
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-300">{content.tagline}</p>
          {allShows.length > 0 && (
            <p className="mt-6 text-xs uppercase tracking-widest text-stone-400">
              共 {allShows.length} 場演出紀錄
            </p>
          )}
        </div>
      </header>

      <section className="px-6 py-10 sm:px-10">
        {allShows.length > 0 && (
          <form
            method="get"
            className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-stage-700 bg-stage-900/60 p-4"
          >
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-stone-500" htmlFor="year">
                年份
              </label>
              <select
                id="year"
                name="year"
                defaultValue={selectedYear}
                className="rounded-md border border-stage-700 bg-stage-950 px-3 py-1.5 text-sm text-paper focus:border-marquee focus:outline-none"
              >
                <option value="">全部</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-stone-500" htmlFor="venue">
                場地
              </label>
              <select
                id="venue"
                name="venue"
                defaultValue={selectedVenue}
                className="max-w-[14rem] rounded-md border border-stage-700 bg-stage-950 px-3 py-1.5 text-sm text-paper focus:border-marquee focus:outline-none"
              >
                <option value="">全部</option>
                {venues.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="rounded-md bg-marquee px-4 py-1.5 text-sm font-bold text-stage-950 transition hover:bg-marquee/80"
            >
              篩選
            </button>

            {hasFilter && (
              <a href="/" className="text-xs uppercase tracking-widest text-stone-500 hover:text-marquee">
                清除篩選
              </a>
            )}
          </form>
        )}

        {hasFilter && filteredShows.length === 0 && (
          <p className="py-16 text-center text-stone-500">沒有符合篩選條件的場次。</p>
        )}

        {upcoming.length > 0 && <ShowListSection title="近期場次" shows={upcoming} accent />}
        {(!hasFilter || past.length > 0) && <ShowListSection title="歷史場次" shows={past} collapsible={!hasFilter} />}

        {allShows.length === 0 && (
          <p className="py-20 text-center text-stone-500">目前還沒有上架的場次，敬請期待。</p>
        )}
      </section>
    </main>
  );
}
