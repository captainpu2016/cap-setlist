import { createClient } from '@/lib/supabase/server';
import type { Show } from '@/types/database';
import { getSiteContent } from '@/lib/site-settings';
import { getCity } from '@/lib/format';
import ShowListSection from './show-list-section';
import SiteLogo from '@/components/SiteLogo';
import FilterBar from './filter-bar';

export const revalidate = 60;

interface HomeSearchParams {
  year?: string;
  month?: string;
  venue?: string;
  city?: string;
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
  const months = Array.from(new Set(allShows.map((s) => s.show_date.slice(5, 7)))).sort((a, b) =>
    a.localeCompare(b)
  );
  const venues = Array.from(new Set(allShows.map((s) => s.venue).filter((v): v is string => Boolean(v)))).sort(
    (a, b) => a.localeCompare(b, 'zh-Hant')
  );
  const cities = Array.from(
    new Set(allShows.map((s) => getCity(s.venue)).filter((c): c is string => Boolean(c)))
  ).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  const selectedYear = searchParams.year ?? '';
  const selectedMonth = searchParams.month ?? '';
  const selectedVenue = searchParams.venue ?? '';
  const selectedCity = searchParams.city ?? '';
  const hasFilter = Boolean(selectedYear || selectedMonth || selectedVenue || selectedCity);

  const filteredShows = allShows.filter((s) => {
    if (selectedYear && !s.show_date.startsWith(selectedYear)) return false;
    if (selectedMonth && s.show_date.slice(5, 7) !== selectedMonth) return false;
    if (selectedVenue && s.venue !== selectedVenue) return false;
    if (selectedCity && getCity(s.venue) !== selectedCity) return false;
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
          <FilterBar
            years={years}
            months={months}
            venues={venues}
            cities={cities}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedVenue={selectedVenue}
            selectedCity={selectedCity}
            hasFilter={hasFilter}
          />
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