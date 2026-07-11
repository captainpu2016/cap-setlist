import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/auth/spotify/callback
 * Spotify 授權完成後導回此路由，用 code 換 refresh token 並寫入 app_settings。
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', siteUrl));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = cookies().get('spotify_oauth_state')?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL('/admin/settings/spotify?error=invalid_state', siteUrl)
    );
  }
  cookies().delete('spotify_oauth_state');

  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${siteUrl}/api/auth/spotify/callback`
    })
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/admin/settings/spotify?error=token_exchange', siteUrl));
  }

  const tokenJson = await tokenRes.json();
  const refreshToken = tokenJson.refresh_token as string | undefined;

  if (!refreshToken) {
    return NextResponse.redirect(new URL('/admin/settings/spotify?error=no_refresh_token', siteUrl));
  }

  const admin = createAdminClient();
  await admin
    .from('app_settings')
    .upsert({ key: 'spotify_refresh_token', value: refreshToken }, { onConflict: 'key' });

  return NextResponse.redirect(new URL('/admin/settings/spotify?connected=1', siteUrl));
}
