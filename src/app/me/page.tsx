import type { Metadata } from 'next';
import { getArchive } from '@/lib/archive';
import { getCity, todayTaipei } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';
import MeClient, { type MeShow } from './me-client';

export const revalidate = 3600;

// 個人頁沒有公開內容可收錄
export const metadata: Metadata = {
  title: '我的現場紀錄｜普通隊長',
  robots: { index: false, follow: true }
};

export default async function MePage() {
  const { shows } = await getArchive();
  const today = todayTaipei();

  const meShows: MeShow[] = shows
    .filter((s) => s.date <= today)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      date: s.date,
      venue: s.venue,
      city: getCity(s.venue),
      songs: s.songs.map((x) => ({ id: x.id, title: x.title }))
    }));

  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <BackLink />
        <div className="mt-6">
          <PageHeader
            eyebrow="My Recap"
            title="我的現場紀錄"
            description="標記你去過的場次，看看你在現場聽過哪些歌，並產生一張可以分享的回顧卡。"
          />
        </div>
        <MeClient shows={meShows} />
      </div>
    </main>
  );
}
