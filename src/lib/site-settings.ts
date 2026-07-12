import { createClient } from '@/lib/supabase/server';

export type SiteContent = {
  eyebrow: string;
  tagline: string;
};

/** 資料庫還沒有值時的預設文案，確保首頁永遠有東西可以顯示 */
const DEFAULTS: SiteContent = {
  eyebrow: 'Setlist Archive',
  tagline: '瀏覽每一場演出的完整歌單，找到當天播了哪些歌，並可一鍵生成同名 Spotify 播放清單。'
};

export async function getSiteContent(): Promise<SiteContent> {
  const supabase = createClient();
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['homepage_eyebrow', 'homepage_tagline'])
    .returns<{ key: string; value: string | null }[]>();

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));

  return {
    eyebrow: map.get('homepage_eyebrow') || DEFAULTS.eyebrow,
    tagline: map.get('homepage_tagline') || DEFAULTS.tagline
  };
}
