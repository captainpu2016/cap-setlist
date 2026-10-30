import type { Metadata } from 'next';
import { getArchive } from '@/lib/archive';
import { formatShowDate } from '@/lib/format';
import { breadcrumbJsonLd, getSiteUrl } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '關於本站與常見問題｜普通隊長歌單全紀錄',
  description: '普通隊長演出歌單資料庫的收錄範圍、更新方式與使用說明，以及常見問題。',
  alternates: { canonical: '/about' }
};

export default async function AboutPage() {
  const { stats, shows } = await getArchive();
  const url = getSiteUrl();

  const range =
    stats.firstDate && stats.latestPastDate
      ? `從 ${formatShowDate(stats.firstDate)} 到 ${formatShowDate(stats.latestPastDate)}`
      : '尚在整理中';

  const faqs: { q: string; a: string }[] = [
    {
      q: '這個網站是什麼？',
      a: '這是「普通隊長」（Captain Ordinary）演出歌單的資料庫，逐場收錄演出日期、場地與完整歌單，讓歌迷可以回顧每一場演出唱了哪些歌。'
    },
    {
      q: '目前收錄了多少場演出與歌曲？',
      a: `目前共收錄 ${stats.showCount} 場演出、${stats.cityCount} 座城市、${stats.songCount} 首曾被演出的歌曲，資料${range}。`
    },
    {
      q: '怎麼查某一首歌在哪些場次唱過？',
      a: '到「搜尋歌曲」頁輸入歌名，就會列出這首歌唱過的所有場次，並依演出日期排序；每首歌也有專屬頁面，可以直接分享。'
    },
    {
      q: '為什麼有些場次看不到歌單？',
      a: '部分場次會設定歌單的公開時間，時間到之前頁面只會顯示公開時間，避免提前劇透。時間一到，歌單就會自動顯示。'
    },
    {
      q: '資料多久更新一次？',
      a: '歌單由管理者在後台維護，更新後網站通常在一分鐘內同步。'
    },
    {
      q: '可以在這裡聽歌嗎？',
      a: '有提供連結的歌曲，可以在單場歌單頁直接播放或前往 Spotify、Apple Music、YouTube 收聽。'
    },
    {
      q: '怎麼分享某一場的歌單？',
      a: '單場頁有「分享歌單卡片」按鈕，會產生一張帶有演出照片、完整歌單與 QR code 的圖片，可以直接傳到社群或通訊軟體。'
    },
    {
      q: '怎麼把演出加進我的行事曆？',
      a: '單場頁的「加入行事曆」可以下載單場活動；想一次追蹤所有場次，可以用首頁「近期場次」旁的「訂閱行事曆」，或直接在行事曆 App 加入訂閱網址 /calendar.ics，之後新增與更動的場次會自動同步。'
    },
    {
      q: '這個網站是官方網站嗎？',
      a: '本站是整理演出歌單的資料庫，內容以公開演出資訊為準。若發現歌單有誤，歡迎透過首頁上的聯絡方式告訴我們。'
    }
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${url}/about`,
    url: `${url}/about`,
    name: '關於本站與常見問題',
    inLanguage: 'zh-Hant-TW',
    isPartOf: { '@id': `${url}/#website` },
    ...(stats.lastUpdated ? { dateModified: stats.lastUpdated } : {})
  };

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <JsonLd
        data={[
          aboutJsonLd,
          faqJsonLd,
          breadcrumbJsonLd([
            { name: '首頁', path: '/' },
            { name: '關於本站', path: '/about' }
          ])
        ]}
      />
      <div className="mx-auto max-w-2xl">
        <BackLink />
        <div className="mt-6">
          <PageHeader eyebrow="About" title="關於本站" description="普通隊長演出歌單資料庫的收錄範圍與使用說明。" />
        </div>

        <section className="mt-10 border-t-2 border-paper pt-5" aria-label="資料概況">
          <dl className="grid grid-cols-3 gap-4 font-accent">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Shows</dt>
              <dd className="text-3xl font-bold text-paper">{stats.showCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Songs</dt>
              <dd className="text-3xl font-bold text-paper">{stats.songCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-stone-500">Cities</dt>
              <dd className="text-3xl font-bold text-paper">{stats.cityCount}</dd>
            </div>
          </dl>
          {stats.lastUpdated && (
            <p className="mt-4 text-xs text-stone-500">
              資料最後更新：<time dateTime={stats.lastUpdated}>{stats.lastUpdated.slice(0, 10)}</time>
              {shows.length > 0 && `・最新一場：${shows[0].title}`}
            </p>
          )}
        </section>

        <section className="mt-12">
          <h2 className="section-title mb-6 text-2xl">常見問題</h2>
          <div className="space-y-8">
            {faqs.map((f) => (
              <article key={f.q}>
                <h3 className="text-lg font-black text-paper">{f.q}</h3>
                <p className="mt-2 leading-relaxed text-stone-400">{f.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t-2 border-paper pt-4 text-sm text-stone-400">
          <h2 className="font-black text-paper">給 AI 與開發者</h2>
          <p className="mt-2 leading-relaxed">
            本站提供純文字的資料入口：<a className="text-marquee underline" href="/llms.txt">/llms.txt</a>（網站導覽）與{' '}
            <a className="text-marquee underline" href="/llms-full.txt">/llms-full.txt</a>（所有場次的完整歌單），
            每個頁面也附有 schema.org 結構化資料；演出行事曆訂閱網址是{' '}
            <a className="text-marquee underline" href="/calendar.ics">/calendar.ics</a>。
          </p>
        </section>
      </div>
    </main>
  );
}
