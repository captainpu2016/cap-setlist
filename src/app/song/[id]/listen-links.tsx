'use client';

import { trackEvent } from '@/lib/analytics';

export interface ListenLink {
  platform: 'spotify' | 'apple_music' | 'youtube';
  label: string;
  href: string;
}

export default function ListenLinks({ links, songTitle }: { links: ListenLink[]; songTitle: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.platform}
          href={l.href}
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => trackEvent('streaming_link_click', { platform: l.platform, song_title: songTitle })}
          className="btn-ghost"
        >
          {l.label} ↗
        </a>
      ))}
    </div>
  );
}
