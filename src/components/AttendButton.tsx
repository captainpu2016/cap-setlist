'use client';

import { useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/device-id';

export default function AttendButton({ showId, initialCount }: { showId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [attended, setAttended] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const flag = window.localStorage.getItem(`ncap_attended_${showId}`);
    if (flag === '1') setAttended(true);
  }, [showId]);

  async function handleClick() {
    if (attended || loading) return;
    setLoading(true);

    setAttended(true);
    setCount((c) => c + 1);

    try {
      const deviceId = getDeviceId();
      const res = await fetch(`/api/shows/${showId}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      const json = await res.json();

      if (res.ok) {
        setCount(json.count);
        window.localStorage.setItem(`ncap_attended_${showId}`, '1');
      } else {
        setAttended(false);
        setCount((c) => c - 1);
      }
    } catch {
      setAttended(false);
      setCount((c) => c - 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={attended || loading}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
        attended
          ? 'border-marquee bg-marquee/10 text-marquee'
          : 'border-stage-700 text-stone-300 hover:border-marquee hover:text-marquee'
      } disabled:cursor-default`}
    >
      <HandIcon filled={attended} />
      {attended ? '你也在現場！' : '我有參與'}
      <span className="tabular-nums text-stone-500">· {count}</span>
    </button>
  );
}

function HandIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-4.53a1.5 1.5 0 0 1 2.06-2.15L6 14" />
    </svg>
  );
}
