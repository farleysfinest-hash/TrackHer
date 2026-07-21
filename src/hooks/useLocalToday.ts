import { useEffect, useState } from 'react';
import { msUntilNextLocalMidnight, todayISO } from '../utils/localDate';

/**
 * Live civil "today" in an IANA timezone.
 * Recomputes on focus/visibility and schedules a wake at local midnight.
 */
export function useLocalToday(timezone: string): string {
  const [today, setToday] = useState(() => todayISO(timezone));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const sync = () => {
      setToday(todayISO(timezone));
    };

    const scheduleMidnight = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sync();
        scheduleMidnight();
      }, msUntilNextLocalMidnight(timezone));
    };

    sync();
    scheduleMidnight();

    const onResume = () => {
      sync();
      scheduleMidnight();
    };

    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onResume);

    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [timezone]);

  return today;
}
