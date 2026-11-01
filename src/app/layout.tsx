import type { Metadata, Viewport } from 'next';
import GoogleAnalyticsGate from '@/components/GoogleAnalyticsGate';
import { Noto_Sans_TC, Oswald } from 'next/font/google';
import BottomNav from '@/components/BottomNav';
import SiteHeader from '@/components/SiteHeader';
import Stars from '@/components/Stars';
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
  applicationName: '普通隊長 歌單全紀錄',
  keywords: ['普通隊長', 'Captain Ordinary', '演出歌單', 'setlist', '樂團', '巡演'],
  alternates: { canonical: '/' },
  icons: {
    icon: '/brand/cover.png'
  },
  openGraph: {
    title: '普通隊長｜近年演出歌單全紀錄',
    description: '每場演出，都有屬於它的歌單。這裡支援線上播放，讓你重溫現場的熱情與每一段難忘的回憶。',
    siteName: '普通隊長 歌單全紀錄',
    locale: 'zh_TW',
    type: 'website',
    images: ['/brand/cover.png']
  },
  twitter: {
    card: 'summary_large_image',
    title: '普通隊長｜近年演出歌單全紀錄',
    description: '每場演出，都有屬於它的歌單。',
    images: ['/brand/cover.png']
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } }
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
          <Stars size={18} className="mx-auto text-signal" />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-accent text-xs uppercase tracking-[0.2em] text-stone-400">
            <a href="/" className="hover:text-marquee">首頁</a>
            <a href="/shows" className="hover:text-marquee">全部場次</a>
            <a href="/tour" className="hover:text-marquee">巡演足跡</a>
            <a href="/stats" className="hover:text-marquee">歌單統計</a>
            <a href="/search" className="hover:text-marquee">搜尋歌曲</a>
            <a href="/me" className="hover:text-marquee">我的紀錄</a>
            <a href="/about" className="hover:text-marquee">關於本站</a>
            <a href="/privacy" className="hover:text-marquee">隱私權說明</a>
          </div>
          <p className="mt-4 font-accent text-[11px] uppercase tracking-[0.25em] text-stone-600">
            © {new Date().getFullYear()} Captain Ordinary
          </p>
        </footer>

        <BottomNav />
      </body>
      {gaId && <GoogleAnalyticsGate gaId={gaId} />}
    </html>
  );
}
