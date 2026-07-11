import { createAdminClient } from '@/lib/supabase/admin';

export default async function SpotifySettingsPage({
  searchParams
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('app_settings')
    .select('value, updated_at')
    .eq('key', 'spotify_refresh_token')
    .single<{ value: string | null; updated_at: string }>();

  const isConnected = Boolean(data?.value);

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-stone-900">Spotify 官方帳號授權</h1>
      <p className="mt-1 text-sm text-stone-500">
        這頁只需要在專案初期設定一次。授權後，訪客在前台按下「生成播放清單」時，會用這個官方帳號建立播放清單。
      </p>

      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <p className="text-sm font-medium text-stone-700">目前狀態</p>
        <p className="mt-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
              ● 已連接
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-500">
              ○ 未連接
            </span>
          )}
        </p>
        {data?.updated_at && (
          <p className="mt-2 text-xs text-stone-400">
            最後更新：{new Date(data.updated_at).toLocaleString('zh-TW')}
          </p>
        )}

        {searchParams.connected && (
          <p className="mt-3 text-sm text-green-700">連接成功！現在訪客可以生成播放清單了。</p>
        )}
        {searchParams.error && (
          <p className="mt-3 text-sm text-red-600">
            授權過程發生問題（{searchParams.error}），請再試一次。
          </p>
        )}

        <a href="/api/auth/spotify" className="admin-btn mt-5 inline-flex bg-[#1DB954] hover:bg-[#1ed760]">
          {isConnected ? '重新連接 Spotify 官方帳號' : '連接 Spotify 官方帳號'}
        </a>

        <p className="mt-4 text-xs text-stone-400">
          若之前授權的 token 已在 Spotify 端被撤銷，訪客生成播放清單時會看到錯誤訊息，
          屆時請回來這頁重新連接一次即可。
        </p>
      </div>
    </div>
  );
}
