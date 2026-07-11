import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/spotify
 * 後台「連接 Spotify 官方帳號」按鈕導向此路由，此路由再導向 Spotify 授權頁。
 * 必須是已登入的管理者才能觸發，避免任意人發動 OAuth 綁架官方帳號。
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_SITE_URL));
  }

  const state = randomBytes(16).toString('hex');
  cookies().set('spotify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: 'playlist-modify-public',
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/spotify/callback`,
    state
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
