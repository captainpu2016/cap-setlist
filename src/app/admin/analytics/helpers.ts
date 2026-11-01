/** 把 GA 的 sessionSource 歸成管理者看得懂的幾大類 */
export function classifySource(source: string): string {
  const s = source.toLowerCase();
  if (s === '(direct)' || s === '(not set)') return '直接進站';
  if (/chatgpt|openai|perplexity|gemini|claude|copilot|you\.com|poe\.com|deepseek|kimi/.test(s)) return 'AI 助手';
  if (/google/.test(s)) return 'Google';
  if (/bing|yahoo|duckduckgo|ecosia|baidu|yandex/.test(s)) return '其他搜尋引擎';
  if (/instagram|^ig$/.test(s)) return 'Instagram';
  if (/facebook|^fb$|fb\.com/.test(s)) return 'Facebook';
  if (/threads/.test(s)) return 'Threads';
  if (/^t\.co$|twitter|^x\.com$/.test(s)) return 'X';
  if (/youtube/.test(s)) return 'YouTube';
  if (/line/.test(s)) return 'LINE';
  if (/ptt|dcard/.test(s)) return '論壇';
  return '其他網站';
}

export function isAiSource(source: string): boolean {
  return classifySource(source) === 'AI 助手';
}

/** GA 的城市是英文，轉成網站用的中文縣市名稱，對不到就回傳 null */
const TW_CITIES: [RegExp, string][] = [
  [/new taipei|xinbei|banqiao|sanchong|zhonghe|xindian|tucheng/, '新北'],
  [/taipei/, '台北'],
  [/taoyuan|zhongli|jhongli/, '桃園'],
  [/hsinchu|zhubei/, '新竹'],
  [/miaoli/, '苗栗'],
  [/taichung/, '台中'],
  [/changhua/, '彰化'],
  [/nantou/, '南投'],
  [/yunlin|douliu/, '雲林'],
  [/chiayi/, '嘉義'],
  [/tainan/, '台南'],
  [/kaohsiung/, '高雄'],
  [/pingtung/, '屏東'],
  [/yilan|ilan/, '宜蘭'],
  [/hualien/, '花蓮'],
  [/taitung/, '台東'],
  [/keelung/, '基隆']
];

export function toTaiwanCity(gaCity: string): string | null {
  const c = gaCity.toLowerCase();
  for (const [re, name] of TW_CITIES) if (re.test(c)) return name;
  return null;
}

export function normalizeCity(name: string): string {
  return name.replace(/臺/g, '台').replace(/[縣市]$/, '');
}

export function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}
