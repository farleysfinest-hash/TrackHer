import { useState, useCallback, useEffect, useRef } from 'react';
import { useCheckins } from './useCheckins';
import { useAuthStore } from '../stores/authStore';
import type { SymptomCheckin } from '../types/database';
import { getLocalDateISO, getResolvedTimezone, hasMRSData } from '../utils/checkinHelpers';
import { dayOfWeekISO, daysBetweenISO } from '../utils/localDate';

function sameCalendarMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

function uniqueDates(checkins: SymptomCheckin[]): string[] {
  return [...new Set(checkins.map((c) => c.checkin_date))];
}

export function useCheckinStatus() {
  const { checkins, getTodaysCheckin, getLastCheckin } = useCheckins();
  const userId = useAuthStore((s) => s.user?.id);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const checkinDay = useAuthStore((s) => s.profile?.checkin_day ?? null);

  const getTodaysCheckinRef = useRef(getTodaysCheckin);
  getTodaysCheckinRef.current = getTodaysCheckin;
  const getLastCheckinRef = useRef(getLastCheckin);
  getLastCheckinRef.current = getLastCheckin;

  const [status, setStatus] = useState({
    hasCheckedInToday: false,
    todaysCheckin: null as SymptomCheckin | null,
    lastCheckinDate: null as string | null,
    isDue: true,
    daysSinceLastCheckin: null as number | null,
    daysLoggedThisMonth: null as number | null,
    totalDaysLogged: null as number | null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const computeStatus = useCallback(
    async (
      today: SymptomCheckin | null,
      lastCheckin: SymptomCheckin | null,
      todayStr: string,
    ) => {
      const lastDate = lastCheckin?.checkin_date ?? null;
      let daysSinceLastCheckin: number | null = null;
      if (lastDate) {
        daysSinceLastCheckin = daysBetweenISO(lastDate, todayStr);
      }

      const lastFull = [...checkins]
        .filter(hasMRSData)
        .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0];
      const hasRecentFull =
        !!lastFull && daysBetweenISO(lastFull.checkin_date, todayStr) < 7;

      let isDue = false;
      if (today && hasMRSData(today)) {
        // Full check-in today satisfies due-ness.
        isDue = false;
      } else if (hasRecentFull) {
        isDue = false;
      } else if (checkinDay === null) {
        // If user hasn't picked a day yet, weekly check-in is due as soon as it's been 7+ days.
        isDue = true;
      } else {
        // Convention: 0 = Sunday ... 6 = Saturday (matches JS Date#getDay()).
        const todayDow = dayOfWeekISO(todayStr);
        isDue = todayDow >= checkinDay;
      }

      const allDates = uniqueDates(checkins);
      const monthDates = allDates.filter((d) => sameCalendarMonth(d, todayStr));
      const daysLoggedThisMonth = monthDates.length > 0 ? monthDates.length : null;
      const totalDaysLogged = allDates.length > 0 ? allDates.length : null;

      return {
        hasCheckedInToday: !!today,
        todaysCheckin: today,
        lastCheckinDate: lastDate,
        isDue,
        daysSinceLastCheckin,
        daysLoggedThisMonth,
        totalDaysLogged,
      };
    },
    [checkins, checkinDay],
  );

  const refresh = useCallback(async () => {
    const todayStr = getLocalDateISO(timezone);

    const [today, lastCheckin] = await Promise.all([
      getTodaysCheckinRef.current(),
      getLastCheckinRef.current(),
    ]);

    setStatus(await computeStatus(today, lastCheckin, todayStr));
    setIsLoading(false);
  }, [timezone, computeStatus]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!userId) return;
        const todayStr = getLocalDateISO(timezone);
        const [today, lastCheckin] = await Promise.all([
          getTodaysCheckinRef.current(),
          getLastCheckinRef.current(),
        ]);

        if (cancelled) return;

        setStatus(await computeStatus(today, lastCheckin, todayStr));
      } catch (err) {
        console.error('Failed to fetch checkin status:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, timezone, computeStatus]);

  return { ...status, isLoading, refresh };
}
