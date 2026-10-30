import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/** 公開資料快取秒數：資料庫在雪梨，距離遠，所以讓查詢結果在伺服器端快取一小段時間 */
const REVALIDATE_SECONDS = 60;

/**
 * 給「前台公開頁面」讀資料用的 Supabase client。
 *
 * 跟 server.ts 的差別：不讀 cookies，所以頁面可以被 Next.js 快取（ISR），
 * 而且每個查詢都會進 Next.js 的 Data Cache，不必每次都跨洋問資料庫。
 * 只能讀到 RLS 對匿名訪客開放的資料；後台頁面請繼續用 server.ts。
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, next: { revalidate: REVALIDATE_SECONDS } })
      }
    }
  );
}
