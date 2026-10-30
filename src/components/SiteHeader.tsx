'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '場次', match: (p: string) => p === '/' || p.startsWith('/show') },
  { href: '/tour', label: '巡演足跡', match: (p: string) => p.startsWith('/tour') },
  { href: '/search', label: '搜尋歌曲', match: (p: string) => p.startsWith('/search') }
];

/** 全站頂部導覽列；後台有自己的版面，所以在 /admin 底下不顯示 */
export default function SiteHeader() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-stage-700 bg-stage-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 sm:px-10">
        <Link href="/" aria-label="普通隊長 首頁" className="flex items-center">
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="普通隊長 Captain Ordinary"
            width={160}
            height={90}
            priority
            className="-ml-2 h-11 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`relative px-4 py-4 text-sm font-bold tracking-wider transition-colors ${
                  active ? 'text-paper' : 'text-stone-400 hover:text-paper'
                }`}
              >
                {l.label}
                {active && <span className="absolute inset-x-3 bottom-0 h-[3px] bg-signal" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
