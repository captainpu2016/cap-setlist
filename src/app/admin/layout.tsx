import Link from 'next/link';

const NAV = [
  { href: '/admin', label: '總覽' },
  { href: '/admin/songs', label: '歌曲資料庫' },
  { href: '/admin/shows', label: '場次管理' },
  { href: '/admin/settings/site', label: '網站文案' },
  { href: '/admin/settings/spotify', label: 'Spotify 設定' }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100">
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-stone-200 bg-white px-4 py-6 sm:block">
          <p className="px-2 font-display text-sm font-bold text-stone-900">普通隊長後台</p>
          <nav className="mt-6 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-2 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action="/api/auth/logout" method="post" className="mt-8 px-2">
            <button className="text-xs text-stone-400 hover:text-red-600">登出</button>
          </form>
        </aside>

        <div className="flex-1">
          <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:hidden">
            <p className="font-display text-sm font-bold text-stone-900">普通隊長後台</p>
            <form action="/api/auth/logout" method="post">
              <button className="text-xs text-stone-400">登出</button>
            </form>
          </header>
          <nav className="flex gap-3 overflow-x-auto border-b border-stone-200 bg-white px-4 py-2 text-sm sm:hidden">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap text-stone-600">
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
