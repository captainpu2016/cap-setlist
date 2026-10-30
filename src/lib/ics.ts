/**
 * 產生 iCalendar（RFC 5545）內容的小工具，訂閱 feed 與「加入行事曆」按鈕共用。
 * 時間一律以台灣時間輸入，輸出成 UTC，行事曆程式不需要 VTIMEZONE 也不會錯位。
 */

export function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 每行最多 75 個位元組，超過要折行（續行以一個空白開頭）；中文一個字 3 位元組，所以要按位元組切 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // 續行開頭有一個空白，占 1 位元組
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function dateOnly(date: string): string {
  return date.replace(/-/g, '');
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export type IcsEvent = {
  uid: string;
  title: string;
  /** YYYY-MM-DD（台灣） */
  date: string;
  /** HH:MM 或 HH:MM:SS（台灣時間）；沒有就用全天事件 */
  startTime?: string | null;
  venue?: string | null;
  description?: string | null;
  url?: string | null;
  /** 最後更新時間（ISO），用來讓行事曆知道事件有沒有改動 */
  updatedAt?: string | null;
  /** 有開演時間時，預設的活動長度（小時） */
  durationHours?: number;
};

export function buildEvent(e: IcsEvent): string[] {
  const stamp = utcStamp(e.updatedAt ? new Date(e.updatedAt) : new Date());
  const lines = ['BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`];

  const time = e.startTime?.slice(0, 5);
  if (time) {
    const start = new Date(`${e.date}T${time}:00+08:00`);
    const end = new Date(start.getTime() + (e.durationHours ?? 3) * 3_600_000);
    lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`);
  } else {
    // 全天事件的結束日是「不含」的，所以要填隔天
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`);
  }

  lines.push(`SUMMARY:${icsEscape(e.title)}`);
  if (e.venue) lines.push(`LOCATION:${icsEscape(e.venue)}`);
  if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
  if (e.url) lines.push(`URL:${e.url}`);
  if (e.updatedAt) lines.push(`LAST-MODIFIED:${utcStamp(new Date(e.updatedAt))}`);
  lines.push('STATUS:CONFIRMED', 'END:VEVENT');
  return lines;
}

export function buildCalendar(name: string, events: IcsEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Captain Ordinary//Setlist Archive//TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(name)}`,
    'X-WR-TIMEZONE:Asia/Taipei',
    // 訂閱的行事曆多久重新抓一次
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
    ...events.flatMap(buildEvent),
    'END:VCALENDAR'
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
