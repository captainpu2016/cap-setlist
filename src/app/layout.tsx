import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Noto_Sans_TC, Oswald } from 'next/font/google';
import BottomNav from '@/components/BottomNav';
import SiteHeader from '@/components/SiteHeader';
import './globals.css';

const body = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-body'
});

/** 英文標籤、日期、數字用的窄體字，帶出演唱會海報的力道 */
const accent = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-accent'
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000'),
  title: '普通隊長｜近年演出歌單全紀錄',
  description: '每場演出，都有屬於它的歌單。這裡支援線上播放，讓你重溫現場的熱情與每一段難忘的回憶。',
  icons: {
    icon: '/brand/cover.png'
  },
  openGraph: {
    title: '普通隊長｜近年演出歌單全紀錄',
    description: '每場演出，都有屬於它的歌單。這裡支援線上播放，讓你重溫現場的熱情與每一段難忘的回憶。',
    images: ['/brand/cover.png']
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0908'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="zh-Hant">
      <body className={`${body.variable} ${accent.variable} font-body bg-stage-950 text-paper pb-14 sm:pb-0`}>
        <SiteHeader />
        {children}

        <footer className="border-t border-stage-700 px-6 py-12 text-center sm:px-10">
          <div className="star-rule mx-auto max-w-xs" aria-hidden>
            ★★★
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-accent text-xs uppercase tracking-[0.2em] text-stone-400">
            <a href="/" className="hover:text-marquee">首頁</a>
            <a href="/shows" className="hover:text-marquee">全部場次</a>
            <a href="/tour" className="hover:text-marquee">巡演足跡</a>
            <a href="/search" className="hover:text-marquee">搜尋歌曲</a>
            <a href="/privacy" className="hover:text-marquee">隱私權說明</a>
          </div>
          <p className="mt-4 font-accent text-[11px] uppercase tracking-[0.25em] text-stone-600">
            © {new Date().getFullYear()} Captain Ordinary
          </p>
        </footer>

        <BottomNav />
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
