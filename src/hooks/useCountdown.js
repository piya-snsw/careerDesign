import { useState, useEffect } from 'react';

export function useCountdown(startAt, duration = 5000) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    if (!startAt) return;

    const startTime = startAt.toMillis?.() || startAt.getTime();
    const endTime = startTime + duration;

    const timer = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, endTime - now);
      setRemaining(left);

      if (left === 0) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [startAt, duration]);

  return Math.ceil(remaining / 1000);
}