'use client';

/** RFC 5545 要求的欄位跳脫：逗號、分號、反斜線、換行都要處理 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcsDate(dateStr: string): string {
  // show_date 是 YYYY-MM-DD，行事曆事件用全天事件表示（DATE 格式：YYYYMMDD）
  return dateStr.replace(/-/g, '');
}

export default function AddToCalendarButton({
  title,
  dateStr,
  venue,
  url
}: {
  title: string;
  dateStr: string;
  venue: string | null;
  url: string;
}) {
  function handleClick() {
    const start = toIcsDate(dateStr);
    // 全天事件的 DTEND 要是隔天（RFC 5545 全天事件區間是不含結束日當天）
    const endDate = new Date(dateStr + 'T00:00:00');
    endDate.setDate(endDate.getDate() + 1);
    const end = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(
      endDate.getDate()
    ).padStart(2, '0')}`;

    const now = new Date();
    const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Normal Captain//Setlist Archive//TW',
      'BEGIN:VEVENT',
      `UID:${stamp}-${Math.random().toString(36).slice(2)}@normalcaptain`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeIcsText(title)}`,
      venue ? `LOCATION:${escapeIcsText(venue)}` : '',
      `DESCRIPTION:${escapeIcsText(`演出歌單：${url}`)}`,
      `URL:${url}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean);

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${title}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-stage-700 px-4 py-2 text-sm text-stone-300 transition hover:border-marquee hover:text-marquee"
    >
      <CalendarIcon /> 加入行事曆
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
