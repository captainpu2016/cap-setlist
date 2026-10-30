import CaptainBadge from '@/components/CaptainBadge';

export const metadata = {
  title: '找不到頁面｜普通隊長'
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-noise bg-halftone px-6 text-center">
      <CaptainBadge size={120} rotate={-4} className="mb-6" />
      <span className="tag-slash">Error 404</span>
      <h1 className="mt-5 text-4xl font-black text-paper sm:text-5xl">這裡沒有歌單</h1>
      <p className="mt-3 max-w-sm text-sm text-stone-400">
        你要找的頁面不存在，可能是網址打錯了，或這場演出還沒上架。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <a
          href="/"
          className="btn-primary"
        >
          回到場次列表
        </a>
        <a href="/search" className="font-accent text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-marquee">
          搜尋歌曲 →
        </a>
      </div>
    </main>
  );
}
