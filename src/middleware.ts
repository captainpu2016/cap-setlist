import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 所有 /admin/* 路由（除了 /admin/login）都必須有登入 session，
 * 未登入導回 /admin/login。
 *
 * 注意：這只是前端路由保護的第一層。實際寫入資料庫 / 呼叫
 * Spotify API 的 Route Handler 仍必須各自再次驗證 session
 * （見第 4 節「權限與登入設計」的要求）。
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        }
      }
    }
  );

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/admin/login';

  if (pathname.startsWith('/admin') && !isLoginPage && !session) {
    const redirectUrl = new URL('/admin/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginPage && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*']
};
