import type { Metadata } from 'next';
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
  title: '普通隊長｜演出歌單',
  description: '普通隊長歷年演出場次與每場歌單，可一鍵生成 Spotify 播放清單。'
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
