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
