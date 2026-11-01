import type { Show, Venue } from '@/types/database';
import { getCity } from '@/lib/format';

/**
 * 常見演出城市的座標對照表（台灣＋日本，依目前資料出現過的城市先建立，
 * 之後有新城市場次找不到座標，加一筆進來就好）。
 */
export const CITY_COORDINATES: Record<string, [number, number]> = {
  // 台灣
  高雄: [22.6273, 120.3014],
  台北: [25.033, 121.5654],
  臺北: [25.033, 121.5654],
  新北: [25.0169, 121.4628],
  台中: [24.1477, 120.6736],
  臺中: [24.1477, 120.6736],
  台南: [22.9997, 120.227],
  臺南: [22.9997, 120.227],
  桃園: [24.9936, 121.301],
  新竹: [24.8138, 120.9675],
  基隆: [25.1276, 121.7392],
  宜蘭: [24.7021, 121.7378],
  花蓮: [23.9871, 121.6015],
  台東: [22.7583, 121.1444],
  臺東: [22.7583, 121.1444],
  嘉義: [23.4801, 120.4491],
  彰化: [24.0518, 120.5161],
  雲林: [23.7092, 120.4313],
  屏東: [22.5519, 120.5487],
  // 日本
  東京: [35.6762, 139.6503],
  大阪: [34.6937, 135.5023],
  名古屋: [35.1815, 136.9066],
  京都: [35.0116, 135.7681],
  橫濱: [35.4437, 139.638],
  福岡: [33.5904, 130.4017],
  下北沢: [35.6613, 139.6683]
};

/**
 * 取得一場演出的座標：優先用該場次關聯的「場地」自己的精確座標，
 * 場地沒有填座標的話，退回用場地／場次的城市名稱去查對照表，
 * 都查不到就回傳 null（該場不會顯示在地圖上）。
 */
export function getShowCoordinates(
  show: Pick<Show, 'venue'>,
  venue: Pick<Venue, 'latitude' | 'longitude' | 'city'> | null
): [number, number] | null {
  if (venue?.latitude != null && venue?.longitude != null) {
    return [venue.latitude, venue.longitude];
  }
  const city = venue?.city ?? getCity(show.venue);
  if (city && CITY_COORDINATES[city]) {
    return CITY_COORDINATES[city];
  }
  return null;
}

const TAIWAN_CITIES = new Set([
  '台北', '臺北', '新北', '基隆', '桃園', '新竹', '苗栗', '台中', '臺中', '彰化', '南投', '雲林', '嘉義', '台南', '臺南',
  '高雄', '屏東', '宜蘭', '花蓮', '台東', '臺東', '澎湖', '金門', '連江', '馬祖'
]);

/** 場地城市不在台灣（場地欄位的第一個詞，例如「大阪 心斎橋 BRONZE」）就算海外演出；沒填場地不算 */
export function isOverseasVenue(venue: string | null | undefined): boolean {
  const city = getCity(venue ?? null);
  return Boolean(city) && !TAIWAN_CITIES.has(city as string);
}

/** 城市由北到南排序：台灣的城市在前（依緯度，北→南），海外城市在最後（同樣北→南）。查不到座標的城市排在各自區段最後 */
export function sortCitiesNorthToSouth(cities: string[]): string[] {
  const lat = (c: string) => CITY_COORDINATES[c]?.[0] ?? -Infinity;
  const rank = (c: string) => (TAIWAN_CITIES.has(c) ? 0 : 1);
  return [...cities].sort((a, b) => rank(a) - rank(b) || lat(b) - lat(a) || a.localeCompare(b, 'zh-Hant'));
}

/** 海外城市所屬國家（之後有新的海外城市，加一筆進來；沒列到的海外城市會歸在「其他海外」） */
const CITY_COUNTRY: Record<string, string> = {
  東京: '日本', 大阪: '日本', 名古屋: '日本', 京都: '日本', 橫濱: '日本', 福岡: '日本', 札幌: '日本', 神戶: '日本',
  仙台: '日本', 廣島: '日本', 下北沢: '日本', 沖繩: '日本',
  首爾: '韓國', 釜山: '韓國',
  香港: '香港', 澳門: '澳門',
  新加坡: '新加坡', 吉隆坡: '馬來西亞', 曼谷: '泰國', 上海: '中國', 北京: '中國', 深圳: '中國', 廣州: '中國'
};

/** 一場演出所在的國家：台灣、日本…；沒填場地回傳 null，城市不在對照表的海外城市回傳「其他海外」 */
export function countryOfVenue(venue: string | null | undefined): string | null {
  const city = getCity(venue ?? null);
  if (!city) return null;
  if (TAIWAN_CITIES.has(city)) return '台灣';
  return CITY_COUNTRY[city] ?? '其他海外';
}
