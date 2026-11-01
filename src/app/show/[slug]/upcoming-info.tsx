'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

function targetFor(date: string, startTime: string | null): number {
  const time = startTime ? startTime.slice(0, 5) : '00:00';
  return new Date(`${date}T${time}:00+08:00`).getTime();
}

function countdownText(date: string, startTime: string | null, now: number): string | null {
  const target = targetFor(date, startTime);
  const diff = target - now;

  if (diff > 0) {
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    if (days >= 1) return `還有 ${days} 天 ${hours} 小時`;
    if (hours >= 1) return `還有 ${hours} 小時 ${minutes} 分鐘`;
    return `還有 ${Math.max(minutes, 1)} 分鐘開演`;
  }

  // 沒填開演時間時，整天都算「就是今天」
  const todayTW = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  if (todayTW === date) return startTime ? '演出進行中，或剛結束' : '就是今天！';
  return null;
}

/**
 * 還沒開演的場次才會顯示：開演時間、倒數、購票連結、訂閱行事曆。
 * 倒數在瀏覽器端算（避免伺服器快取的時間過期），掛載後每分鐘更新一次。
 */
export default function UpcomingInfo({
  date,
  startTime,
  ticketUrl,
  webcalUrl
}: {
  date: string;
  startTime: string | null;
  ticketUrl: string | null;
  webcalUrl: string;
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setText(countdownText(date, startTime, Date.now()));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [date, startTime]);

  const time = startTime ? startTime.slice(0, 5) : null;

  return (
    <section className="mt-6 border-2 border-signal bg-stage-900 p-4 sm:p-5" aria-label="演出資訊">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="tag-solid">Coming up</span>
          <p className="mt-2 text-2xl font-black text-paper">{text ?? '即將開演'}</p>
          <p className="mt-1 text-sm text-stone-400">{time ? `${time} 開演（台灣時間）` : '開演時間待公布'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ticketUrl && (
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={() => trackEvent('ticket_click')}>
              購票 →
            </a>
          )}
          <a href={webcalUrl} className="btn-ghost" onClick={() => trackEvent('calendar_subscribe', { method: 'feed' })}>
            訂閱演出行事曆
          </a>
        </div>
      </div>
    </section>
  );
}
