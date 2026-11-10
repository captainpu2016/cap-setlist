/**
 * 其他網站（例如樂團的日文官網）的 GA4 與 Search Console 資源，只用來在後台「另外看」它們的數據，
 * 不和本站的數據合併計算。兩個值都不是機密（金鑰只用 service account），所以直接寫預設值；
 * 之後要換資源，用環境變數覆蓋就好，不用改程式。
 */
export const JP_SITE = {
  name: '日文官網',
  url: 'https://captainpu.ryzm.jp/',
  ga4PropertyId: process.env.GA4_PROPERTY_ID_JP ?? '487031805',
  gscSiteUrl: process.env.GSC_SITE_URL_JP ?? 'https://captainpu.ryzm.jp/'
};
