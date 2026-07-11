'use client';

import { useState } from 'react';

interface Props {
  showId: string;
  initialPlaylistUrl: string | null;
  hasAnySpotifyTrack: boolean;
}

export default function GeneratePlaylistButton({
  showId,
  initialPlaylistUrl,
  hasAnySpotifyTrack
}: Props) {
  const [playlistUrl, setPlaylistUrl] = useState(initialPlaylistUrl);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (playlistUrl) {
    return (
      <div>
        <a
          href={playlistUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        >
          開啟 Spotify 播放清單 ↗
        </a>
        <p className="mt-2 text-xs text-stone-500">你可以在 Spotify 裡另存一份到自己的帳號。</p>
      </div>
    );
  }

  if (!hasAnySpotifyTrack) {
    return <p className="text-sm text-stone-500">這場的歌單目前還沒有可串接的 Spotify 曲目。</p>;
  }

  async function handleGenerate() {
    setLoading(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/shows/${showId}/generate-playlist`, { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error ?? '生成失敗，請稍後再試。');
        return;
      }

      setPlaylistUrl(json.playlistUrl);
      if (json.skippedCount > 0) {
        setMessage(`有 ${json.skippedCount} 首歌未加入（尚無串流連結）`);
      }
    } catch {
      setErrorMessage('網路異常，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1DB954] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#1ed760] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? '生成中…' : '生成 Spotify 播放清單'}
      </button>
      {message && <p className="mt-2 text-xs text-marquee">{message}</p>}
      {errorMessage && <p className="mt-2 text-xs text-signal">{errorMessage}</p>}
    </div>
  );
}