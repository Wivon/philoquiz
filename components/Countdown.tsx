"use client";

import { useEffect, useState } from "react";

/**
 * Circular countdown. `startedAt` is the client timestamp (ms) when the
 * question was received; `duration` is in seconds. Calls `onExpire` once.
 */
export function Countdown({
  startedAt,
  duration,
  onExpire,
}: {
  startedAt: number;
  duration: number;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    let expired = false;
    const tick = () => {
      const left = Math.max(0, duration - (Date.now() - startedAt) / 1000);
      setRemaining(left);
      if (left <= 0 && !expired) {
        expired = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startedAt, duration, onExpire]);

  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - remaining / duration);

  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 80 80" className="h-full w-full">
        <circle
          className="ring-track"
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
        />
        <circle
          className="ring-progress"
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white">
        {Math.ceil(remaining)}
      </span>
    </div>
  );
}
