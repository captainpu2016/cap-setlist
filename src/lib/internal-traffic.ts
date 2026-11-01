/** 登入過後台的瀏覽器會留下這個標記，之後不再送出 GA 數據（只存在該瀏覽器，不含任何個資） */
export const INTERNAL_TRAFFIC_KEY = 'cap_internal_traffic';

export function isInternalTraffic(): boolean {
  try {
    return localStorage.getItem(INTERNAL_TRAFFIC_KEY) === '1';
  } catch {
    return false;
  }
}
