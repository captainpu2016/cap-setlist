'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { INTERNAL_TRAFFIC_KEY } from '@/lib/internal-traffic';

/** 後台頁面（登入頁除外，能進到這些頁就代表已登入）把這個瀏覽器標記為站方自己，並立刻停用 GA */
export default function InternalTrafficMark() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === '/admin/login') return;
    try {
      localStorage.setItem(INTERNAL_TRAFFIC_KEY, '1');
    } catch {
      /* 私密模式等情況寫不進去就略過 */
    }
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (gaId) (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true;
  }, [pathname]);
  return null;
}
