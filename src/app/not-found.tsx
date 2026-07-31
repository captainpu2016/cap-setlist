import CaptainBadge from '@/components/CaptainBadge';

export const metadata = {
  title: '找不到頁面｜普通隊長'
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-noise bg-halftone px-6 text-center">
      <CaptainBadge size={96} rotate={-4} className="mb-6" />
      <p className="font-display text-sm uppercase tracking-[0.3em] text-marquee">404</p>
      <h1 className="mt-3 font-display text-3xl font-black text-paper sm:text-4xl">這裡沒有歌單</h1>
      <p className="mt-3 max-w-sm text-sm text-stone-400">
        你要找的頁面不存在，可能是網址打錯了，或這場演出還沒上架。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <a
          href="/"
          className="rounded-full bg-marquee px-5 py-2.5 text-sm font-bold text-stage-950 transition hover:bg-marquee/80"
        >
          回到場次列表
        </a>
        <a href="/search" className="text-xs uppercase tracking-widest text-stone-500 hover:text-marquee">
          搜尋歌曲 →
        </a>
      </div>
    </main>
  );
}
