import { createPublicClient } from '@/lib/supabase/public';
import type { Show } from '@/types/database';
import Image from 'next/image';
import { getSiteContent } from '@/lib/site-settings';
import { getCity } from '@/lib/format';
import ShowListSection from './show-list-section';
import SiteLogo from '@/components/SiteLogo';
import Stars from '@/components/Stars';
import JsonLd from '@/components/JsonLd';
import { musicGroupJsonLd, websiteJsonLd } from '@/lib/seo';
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
      <JsonLd data={[musicGroupJsonLd(), websiteJsonLd()]} />
      <header className="relative flex min-h-[520px] items-end overflow-hidden border-b-4 border-signal sm:min-h-[600px]">
        {content.bgImageUrl && (
          <Image
            src={content.bgImageUrl}
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/* 只在文字所在的左下角壓暗，讓照片本身保持明亮 */}
        <div className="absolute inset-0 bg-gradient-to-t from-stage-950 via-stage-950/40 to-stage-950/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-stage-950/95 via-stage-950/60 to-transparent" />

        <div className="relative mx-auto flex w-full max-w-5xl items-end justify-between gap-8 px-6 pb-10 pt-32 sm:px-10 sm:pb-14">
          <div>
            <div className="flex items-center gap-3">
              <Stars size={16} className="text-signal" />
              <p className="tag-slash">{content.eyebrow}</p>
            </div>
            <h1 className="mt-4">
              <span className="sr-only">普通隊長</span>
              <SiteLogo height={120} className="-ml-3 sm:!h-40" />
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-200 sm:text-base">{content.tagline}</p>

            {allShows.length > 0 && (
              <p className="mt-6 font-accent text-2xl font-semibold text-paper">
                <span className="text-5xl font-bold text-marquee">{allShows.length}</span> 場演出
                <span className="mx-3 text-stone-500">/</span>
                <span className="text-5xl font-bold text-marquee">{cities.length}</span> 座城市
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a href="/tour" className="btn-primary">
                巡演足跡地圖 →
              </a>
              <a href="/search" className="btn-ghost !border-paper/60 !px-5 !py-3 !text-paper hover:!bg-paper hover:!text-stage-950">
                搜尋歌曲
              </a>
            </div>
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