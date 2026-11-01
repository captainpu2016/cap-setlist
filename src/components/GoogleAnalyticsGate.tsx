'use client';

import { useEffect, useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { isInternalTraffic } from '@/lib/internal-traffic';

/** 登入過後台的瀏覽器（站方自己）不載入 GA，避免污染數據 */
export default function GoogleAnalyticsGate({ gaId }: { gaId: string }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (isInternalTraffic()) {
      (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true;
    } else {
      setAllowed(true);
    }
  }, [gaId]);
  return allowed ? <GoogleAnalytics gaId={gaId} /> : null;
}
