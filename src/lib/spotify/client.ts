import { createAdminClient } from '@/lib/supabase/admin';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * 用存在 app_settings 的 refresh token 換一組新的 access token。
 * refresh token 本身通常不會過期，但若使用者在 Spotify 端撤銷授權，
 * 這裡會拋出錯誤，上層需要提示「請重新連接 Spotify」。
 */
export async function getSpotifyAccessToken(): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'spotify_refresh_token')
    .single();

  if (error || !data?.value) {
    throw new Error('SPOTIFY_NOT_CONNECTED');
  }

  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: data.value
    })
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[spotify] token 換發失敗', res.status, body);
    throw new Error(`SPOTIFY_TOKEN_INVALID: ${res.status} ${body}`);
  }

  const json = await res.json();
  return json.access_token as string;
}

export async function getSpotifyUserId(accessToken: string): Promise<string> {
  const res = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[spotify] 取得使用者資訊失敗', res.status, body);
    throw new Error(`SPOTIFY_ME_FAILED: ${res.status} ${body}`);
  }
  const json = await res.json();
  return json.id as string;
}

export async function createSpotifyPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string
): Promise<{ id: string; url: string }> {
  const res = await fetch(`${SPOTIFY_API_BASE}/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, description, public: true })
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[spotify] 建立播放清單失敗', res.status, body);
    throw new Error(`SPOTIFY_CREATE_PLAYLIST_FAILED: ${res.status} ${body}`);
  }
  const json = await res.json();
  return { id: json.id, url: json.external_urls.spotify };
}

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackIds: string[]
): Promise<void> {
  if (trackIds.length === 0) return;
  const uris = trackIds.map((id) => `spotify:track:${id}`);
  const res = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris })
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[spotify] 加入曲目失敗', res.status, body);
    throw new Error(`SPOTIFY_ADD_TRACKS_FAILED: ${res.status} ${body}`);
  }
}
