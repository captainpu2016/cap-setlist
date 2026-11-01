'use client';

import { buildCalendar } from '@/lib/ics';
import { trackEvent } from '@/lib/analytics';

export default function AddToCalendarButton({
  title,
  dateStr,
  venue,
  url,
  startTime,
  ticketUrl
}: {
  title: string;
  dateStr: string;
  venue: string | null;
  url: string;
  startTime?: string | null;
  ticketUrl?: string | null;
}) {
  function handleClick() {
    trackEvent('calendar_subscribe', { method: 'add_event' });
    const ics = buildCalendar(title, [
      {
        uid: `${dateStr}-${title}@normalcaptain`.replace(/\s+/g, '-'),
        title,
        date: dateStr,
        startTime,
        venue,
        description: [ticketUrl ? `購票：${ticketUrl}` : null, `演出資訊與歌單：${url}`].filter(Boolean).join('\n'),
        url
      }
    ]);

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
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
      className="btn-ghost"
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
