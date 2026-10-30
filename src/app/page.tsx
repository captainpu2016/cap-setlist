import { createPublicClient } from '@/lib/supabase/public';
import type { Show } from '@/types/database';
import Image from 'next/image';
import { getSiteContent } from '@/lib/site-settings';
import { getCity } from '@/lib/format';
import ShowListSection from './show-list-section';
import SiteLogo from '@/components/SiteLogo';
import CaptainBadge from '@/components/CaptainBadge';
import Stars from '@/components/Stars';
import FilterBar from './filter-bar';

export const revalidate = 60;

interface HomeSearchParams {
  year?: string;
  month?: string;
  venue?: string;
  city?: string;
}

export default async function HomePage({ searchParams }: { searchParams: HomeSearchParams }) {
  const supabase = createPublicClient();
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
      <header className="relative overflow-hidden border-b-4 border-signal">
        {content.bgImageUrl && (
          <>
            <Image
              src={content.bgImageUrl}
              alt=""
              aria-hidden
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stage-950 via-stage-950/80 to-stage-950/30" />
          </>
        )}
        <div className="relative mx-auto grid max-w-5xl items-center gap-8 px-6 py-14 sm:grid-cols-[1fr_320px] sm:px-10 sm:py-20">
          <div>
            <div className="flex items-center gap-3">
              <Stars size={16} className="text-signal" />
              <p className="tag-slash">{content.eyebrow}</p>
            </div>
            <h1 className="mt-5">
              <span className="sr-only">普通隊長</span>
              <SiteLogo height={120} className="-ml-3 sm:!h-40" />
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-stone-300 sm:text-base">{content.tagline}</p>

            {allShows.length > 0 && (
              <p className="mt-8 font-accent text-2xl font-semibold text-paper">
                <span className="text-5xl font-bold text-marquee">{allShows.length}</span> 場演出
                <span className="mx-3 text-stone-600">/</span>
                <span className="text-5xl font-bold text-marquee">{cities.length}</span> 座城市
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="/tour" className="btn-primary">
                巡演足跡地圖 →
              </a>
              <a href="/search" className="btn-ghost !px-5 !py-3 !font-bold">
                搜尋歌曲
              </a>
            </div>
          </div>

          {/* 紅色斜切色塊從這一欄往右延伸到畫面邊緣，頭盔固定在色塊正中央，不論螢幕多寬都對得齊 */}
          <div className="relative hidden h-full items-center justify-center sm:flex">
            <div
              aria-hidden
              className="absolute -bottom-20 -top-20 left-0 w-[2000px] -skew-x-12 bg-signal"
            />
            <div aria-hidden className="absolute -bottom-20 -top-20 -left-3 w-2 -skew-x-12 bg-marquee" />
            <CaptainBadge size={260} rotate={0} className="relative" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
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