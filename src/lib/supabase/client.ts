'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/** 瀏覽器端使用的 Supabase client（用在 Client Component） */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
