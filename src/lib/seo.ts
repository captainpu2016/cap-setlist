export const SITE_NAME = '普通隊長';
export const SITE_NAME_EN = 'Captain Ordinary';

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
}

/** 樂團本身的結構化資料：讓搜尋引擎與 AI 知道「普通隊長」是一個實體，並串起官方社群 */
export function musicGroupJsonLd() {
  const url = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': `${url}/#band`,
    name: SITE_NAME,
    alternateName: [SITE_NAME_EN, 'フツウ タイチョウ'],
    url,
    logo: `${url}/brand/logo-horizontal-red.png`,
    image: `${url}/brand/cover.png`,
    sameAs: ['https://www.instagram.com/captainpu2016/']
  };
}

export function websiteJsonLd() {
  const url = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    name: `${SITE_NAME} 歌單全紀錄`,
    alternateName: `${SITE_NAME_EN} Setlist Archive`,
    url,
    inLanguage: 'zh-Hant-TW',
    publisher: { '@id': `${url}/#band` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${url}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string'
    }
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const url = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${url}${item.path}`
    }))
  };
}
