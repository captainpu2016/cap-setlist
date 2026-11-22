// 圖片只允許自己的 Supabase 專案（不要用萬用網域，否則別人專案的圖片也能走我們的圖片最佳化、消耗額度）
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return null;
  }
})();

// 安全標頭。CSP 先只限制「誰能把本站嵌進 iframe」（防點擊劫持）；
// 完整的 script/style 白名單會牽涉 GA、Spotify 內嵌、地圖圖磚等，貿然加會弄壞功能，之後另外評估。
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 縮好的圖快取 30 天（預設只有 60 秒，會讓同一張圖被反覆重新縮圖、很快用完 Vercel 的圖片最佳化額度）。
    // 換圖時請用新的檔名；用同一個檔名覆蓋的話，舊的縮圖最多會再顯示 30 天。
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : [])
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

export default nextConfig;
