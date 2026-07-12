'use client';

import { useRef, useState } from 'react';
import { formatDuration, toDropboxDirectUrl } from '@/lib/format';
import type { SetlistItemWithSong } from '@/types/database';

export default function Setlist({ items }: { items: SetlistItemWithSong[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaylistMode, setIsPlaylistMode] = useState(false);

  // 依歌單順序，只留下「有 Dropbox 連結」的可播放曲目
  const playableItems = items.filter((i) => !i.is_placeholder && i.song?.dropbox_url);

  function playItem(item: SetlistItemWithSong, playlistMode: boolean) {
    const audio = audioRef.current;
    if (!audio || !item.song?.dropbox_url) return;

    audio.src = toDropboxDirectUrl(item.song.dropbox_url);
    audio.play().catch(() => {
      // 瀏覽器阻擋自動播放時靜默失敗即可，使用者可以再點一次
    });
    setPlayingId(item.id);
    setIsPlaylistMode(playlistMode);
  }

  function handleTitleToggle(item: SetlistItemWithSong) {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === item.id && !audio.paused) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    playItem(item, false);
  }

  function handlePlaylistToggle() {
    const audio = audioRef.current;
    if (playingId && isPlaylistMode && audio && !audio.paused) {
      audio.pause();
      setPlayingId(null);
      setIsPlaylistMode(false);
      return;
    }
    if (playableItems.length === 0) return;

    // 若目前正停在歌單中某一首（暫停狀態），從那首接續播放；否則從第一首開始
    const resumeFrom = playableItems.find((i) => i.id === playingId) ?? playableItems[0];
    playItem(resumeFrom, true);
  }

  function handleEnded() {
    if (!isPlaylistMode) {
      setPlayingId(null);
      return;
    }
    const currentIndex = playableItems.findIndex((i) => i.id === playingId);
    const next = playableItems[currentIndex + 1];
    if (next) {
      playItem(next, true);
    } else {
      setPlayingId(null);
      setIsPlaylistMode(false);
    }
  }

  const currentPlayingItem = items.find((i) => i.id === playingId);
  const isPlaying = Boolean(playingId);

  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} onEnded={handleEnded} className="hidden" />

      {playableItems.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePlaylistToggle}
            className="inline-flex items-center gap-2 rounded-full bg-marquee px-5 py-2.5 text-sm font-bold text-stage-950 transition hover:bg-marquee/80"
          >
            {isPlaylistMode && isPlaying ? (
              <>
                <PauseIcon /> 暫停播放
              </>
            ) : (
              <>
                <PlayIcon /> 歌單播放
              </>
            )}
          </button>
          {isPlaylistMode && isPlaying && currentPlayingItem?.song && (
            <span className="text-xs text-stone-400">現正播放：{currentPlayingItem.song.title}</span>
          )}
        </div>
      )}

      <ol className="divide-y divide-stage-700">
        {items.map((item, idx) => (
          <SongRow
            key={item.id}
            item={item}
            index={idx}
            isPlaying={playingId === item.id && isPlaying}
            onToggle={() => handleTitleToggle(item)}
          />
        ))}
      </ol>
    </div>
  );
}

function SongRow({
  item,
  index,
  isPlaying,
  onToggle
}: {
  item: SetlistItemWithSong;
  index: number;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  const canPlay = !item.is_placeholder && Boolean(item.song?.dropbox_url);

  return (
    <li className="rounded-md px-2 transition-colors hover:bg-stage-900/70 -mx-2">
      <div className="flex items-center gap-4 py-3">
        {canPlay ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? '暫停' : '播放'}
            className="flex w-6 shrink-0 items-center justify-center text-stone-600 hover:text-marquee"
          >
            {isPlaying ? <PauseIcon small /> : <PlayIcon small />}
          </button>
        ) : (
          <span className="w-6 shrink-0 text-center font-display tabular-nums text-stone-600">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}

        <div className="min-w-0 flex-1">
          {item.is_placeholder ? (
            <p className="italic text-stone-500">敬請期待</p>
          ) : canPlay ? (
            <button type="button" onClick={onToggle} className="block max-w-full text-left">
              <p className={`truncate font-medium transition-colors ${isPlaying ? 'text-marquee' : 'text-paper hover:text-marquee'}`}>
                {item.song?.title}
              </p>
              {item.notes && <p className="text-xs text-stone-500">{item.notes}</p>}
            </button>
          ) : (
            <>
              <p className="truncate font-medium text-paper">{item.song?.title}</p>
              {item.notes && <p className="text-xs text-stone-500">{item.notes}</p>}
            </>
          )}
        </div>

        {!item.is_placeholder && (
          <div className="flex shrink-0 items-center gap-3">
            {item.song?.spotify_track_id && (
              <a
                href={`https://open.spotify.com/track/${item.song.spotify_track_id}`}
                target="_blank"
                rel="noreferrer noopener"
                title="在 Spotify 開啟"
                className="text-stone-500 hover:text-marquee"
              >
                <SpotifyIcon />
              </a>
            )}
            {item.song?.apple_music_url && (
              <a
                href={item.song.apple_music_url}
                target="_blank"
                rel="noreferrer noopener"
                title="在 Apple Music 開啟"
                className="text-stone-500 hover:text-marquee"
              >
                <AppleMusicIcon />
              </a>
            )}
            {item.song?.youtube_url && (
              <a
                href={item.song.youtube_url}
                target="_blank"
                rel="noreferrer noopener"
                title="在 YouTube 開啟"
                className="text-stone-500 hover:text-marquee"
              >
                <YouTubeIcon />
              </a>
            )}
            <span className="w-10 text-right tabular-nums text-xs text-stone-500">
              {formatDuration(item.song?.duration_seconds) ?? '—'}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

function PlayIcon({ small }: { small?: boolean }) {
  const s = small ? 12 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ small }: { small?: boolean }) {
  const s = small ? 12 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.32-1.32 9.719-.66 13.439 1.62.361.181.54.78.301 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.021.599-1.559.3z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.499 6.203a3.008 3.008 0 0 0-2.117-2.128C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.382.53A3.008 3.008 0 0 0 .501 6.203C0 8.093 0 12 0 12s0 3.907.501 5.797a3.008 3.008 0 0 0 2.117 2.128c1.877.53 9.382.53 9.382.53s7.505 0 9.382-.53a3.008 3.008 0 0 0 2.117-2.128C24 15.907 24 12 24 12s0-3.907-.501-5.797zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function AppleMusicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0 0 19.577.03c-.2-.013-.399-.017-.6-.03H5.023c-.24.016-.48.024-.72.048-1.006.096-1.945.4-2.75 1.06C.657 1.87.108 2.87.03 4.157c-.013.213-.02.427-.02.64L0 19.253c.013.214.02.427.02.64.079 1.287.628 2.288 1.523 3.05.805.66 1.744.964 2.75 1.06.24.024.48.032.72.048h13.954c.201-.013.4-.017.6-.03a5.022 5.022 0 0 0 1.999-.86c1.118-.732 1.863-1.732 2.18-3.042.16-.66.238-1.36.24-2.19V6.124zM16.868 5.83v9.652c0 .214-.012.428-.038.633a2.001 2.001 0 0 1-1.593 1.636 2.85 2.85 0 0 1-.79.086c-.85 0-1.628-.485-1.977-1.24-.336-.72-.238-1.6.33-2.24.32-.363.73-.6 1.185-.72.36-.096.72-.13 1.09-.144.264-.012.44-.036.55-.108.096-.06.144-.144.156-.276.012-.096.012-.204.012-.312V6.987c0-.108-.012-.192-.06-.264-.06-.084-.156-.108-.24-.096-.204.036-3.7.744-3.878.78-.144.024-.24.096-.288.204-.036.084-.036.192-.036.324v7.032c0 .576-.036 1.152-.192 1.704-.264.912-.9 1.548-1.812 1.836a2.85 2.85 0 0 1-.906.132c-.85 0-1.628-.48-1.977-1.236-.336-.72-.238-1.596.33-2.236.32-.363.73-.6 1.19-.72.36-.096.72-.13 1.09-.144.264-.012.44-.036.55-.108.096-.06.144-.144.156-.276.012-.096.012-.204.012-.312V6.02c0-.336.096-.516.42-.612.192-.06 8.088-1.632 8.244-1.656.336-.048.516.144.516.492z" />
    </svg>
  );
}
