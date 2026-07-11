import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * 使用 service role key 的後端專用 client，會繞過 RLS。
 * 絕對不可以在瀏覽器端 / Client Component 使用，只能在
 * Route Handler、Server Action 等純伺服器環境呼叫。
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
