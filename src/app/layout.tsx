import type { Metadata, Viewport } from 'next';
import { Noto_Serif_TC, Noto_Sans_TC } from 'next/font/google';
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
  return (
    <html lang="zh-Hant">
      <body className={`${display.variable} ${body.variable} font-body bg-stage-950`}>
        {children}
      </body>
    </html>
  );
}
