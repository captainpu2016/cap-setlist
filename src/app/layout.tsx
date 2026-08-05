import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Noto_Serif_TC, Noto_Sans_TC } from 'next/font/google';
import CaptainBadge from '@/components/CaptainBadge';
import BottomNav from '@/components/BottomNav';
import './globals.css';

const display = Noto_Serif_TC({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-display'
});

const body = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body'
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
  themeColor: '#170f0a'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="zh-Hant">
      <body className={`${display.variable} ${body.variable} font-body bg-stage-950 pb-14 sm:pb-0`}>
        {children}

        <footer className="border-t border-stage-800 px-6 py-10 sm:px-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <CaptainBadge size={40} rotate={-4} />
              <div>
                <p className="font-display text-sm font-bold text-paper">普通隊長</p>
                <p className="mt-1 max-w-xs text-xs text-stone-500">
                  近年演出歌單全紀錄，支援線上播放，重溫每一場現場的熱情。
                </p>
              </div>
            </div>

            <nav className="flex flex-col items-center gap-2 text-xs text-stone-500 sm:items-end">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
                <a href="/" className="hover:text-marquee">首頁</a>
                <a href="/tour" className="hover:text-marquee">巡演足跡</a>
                <a href="/search" className="hover:text-marquee">搜尋歌曲</a>
                <a href="/privacy" className="hover:text-marquee">隱私權說明</a>
              </div>
              <p className="mt-2 text-stone-600">© {new Date().getFullYear()} 普通隊長</p>
            </nav>
          </div>
        </footer>

        <BottomNav />
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
