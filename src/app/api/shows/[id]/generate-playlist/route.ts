import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  addTracksToPlaylist,
  createSpotifyPlaylist,
  getSpotifyAccessToken,
  getSpotifyUserId
} from '@/lib/spotify/client';
import type { Show, SetlistItemWithSong } from '@/types/database';

/**
 * POST /api/shows/[id]/generate-playlist
 *
 * 對外公開的路由（前台訪客會呼叫），不需要登入，但整個邏輯都在
 * 伺服器端用 service role key 執行，訪客端拿不到 Spotify 憑證。
 *
 * 併發保護：先查一次 shows.spotify_playlist_url，若已存在直接回傳，
 * 不重複建立播放清單（見開發指南 6.4 節註記）。
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();

 const { data: show, error: showError } = await admin
    .from('shows')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'published')
    .single<Show>();

  if (showError || !show) {
    return NextResponse.json({ error: '找不到此場次' }, { status: 404 });
  }

  // 已經生成過，直接回傳既有連結，不重複建立
  if (show.spotify_playlist_url) {
    return NextResponse.json({ playlistUrl: show.spotify_playlist_url, skippedCount: 0 });
  }

  const { data: items, error: itemsError } = await admin
    .from('setlist_items')
    .select('*, song:songs(*)')
    .eq('show_id', show.id)
    .order('position', { ascending: true })
    .returns<SetlistItemWithSong[]>();

  if (itemsError) {
    return NextResponse.json({ error: '讀取歌單失敗' }, { status: 500 });
  }

  const setlist = items ?? [];
  const trackIds = setlist
    .filter((i) => !i.is_placeholder && i.song?.spotify_track_id)
    .map((i) => i.song!.spotify_track_id as string);
  const skippedCount = setlist.filter((i) => !i.is_placeholder).length - trackIds.length;

  if (trackIds.length === 0) {
    return NextResponse.json({ error: '這場歌單目前沒有可用的 Spotify 曲目' }, { status: 400 });
  }

  try {
    const accessToken = await getSpotifyAccessToken();
    const userId = await getSpotifyUserId(accessToken);
    const playlist = await createSpotifyPlaylist(
      accessToken,
      userId,
      `${show.title}｜普通隊長`,
      `普通隊長 ${show.show_date} @ ${show.venue ?? ''} 演出歌單`
    );
    await addTracksToPlaylist(accessToken, playlist.id, trackIds);

    // 二次確認寫回前再查一次，避免極端併發下重複建立
    // （Spotify 沒有 upsert，這裡用 update ... where spotify_playlist_url is null 降低風險）
    const { data: updated } = await admin
      .from('shows')
      .update({ spotify_playlist_url: playlist.url })
      .eq('id', show.id)
      .is('spotify_playlist_url', null)
      .select('spotify_playlist_url')
      .single<{ spotify_playlist_url: string | null }>();

    const finalUrl = updated?.spotify_playlist_url ?? playlist.url;

    return NextResponse.json({ playlistUrl: finalUrl, skippedCount });
  } catch (err) {
    console.error('[generate-playlist] 發生錯誤', err);
    const message = err instanceof Error ? err.message : 'UNKNOWN';
    if (message.startsWith('SPOTIFY_NOT_CONNECTED') || message.startsWith('SPOTIFY_TOKEN_INVALID')) {
      return NextResponse.json(
        { error: 'Spotify 官方帳號尚未連接或授權已失效，請聯絡管理者。' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: '生成播放清單時發生錯誤，請稍後再試。' }, { status: 500 });
  }
}
