import { useState, useCallback, useEffect, useRef } from 'react';
import { useCheckins } from './useCheckins';
import { useAuthStore } from '../stores/authStore';
import type { SymptomCheckin } from '../types/database';
import { getLocalDateISO, getResolvedTimezone } from '../utils/checkinHelpers';

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function sameCalendarMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export type CheckinCoverage = { covered: number; window: number };

export function useCheckinStatus() {
  const { getTodaysCheckin, getLastCheckin, getCoverage } = useCheckins();
  const userId = useAuthStore((s) => s.user?.id);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const frequency = useAuthStore((s) => s.profile?.checkin_frequency ?? 'daily');

  const getTodaysCheckinRef = useRef(getTodaysCheckin);
  getTodaysCheckinRef.current = getTodaysCheckin;
  const getLastCheckinRef = useRef(getLastCheckin);
  getLastCheckinRef.current = getLastCheckin;
  const getCoverageRef = useRef(getCoverage);
  getCoverageRef.current = getCoverage;

  const [status, setStatus] = useState({
    hasCheckedInToday: false,
    todaysCheckin: null as SymptomCheckin | null,
    coverage: null as CheckinCoverage | null,
    lastCheckinDate: null as string | null,
    isDue: true,
    daysSinceLastCheckin: null as number | null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const computeStatus = useCallback(
    async (
      today: SymptomCheckin | null,
      coverage: CheckinCoverage | null,
      lastCheckin: SymptomCheckin | null,
      todayStr: string,
    ) => {
      const lastDate = lastCheckin?.checkin_date ?? null;
      let daysSinceLastCheckin: number | null = null;
      if (lastDate) {
        daysSinceLastCheckin = daysBetween(lastDate, todayStr);
      }

      let isDue = false;
      if (today) {
        isDue = false;
      } else if (!lastCheckin) {
        isDue = true;
      } else if (frequency === 'daily') {
        isDue = true;
      } else if (frequency === 'weekly') {
        isDue = daysBetween(lastCheckin.checkin_date, todayStr) >= 7;
      } else {
        isDue = !sameCalendarMonth(lastCheckin.checkin_date, todayStr);
      }

      return {
        hasCheckedInToday: !!today,
        todaysCheckin: today,
        coverage,
        lastCheckinDate: lastDate,
        isDue,
        daysSinceLastCheckin,
      };
    },
    [frequency],
  );

  const refresh = useCallback(async () => {
    const todayStr = getLocalDateISO(timezone);

    const [today, coverage, lastCheckin] = await Promise.all([
      getTodaysCheckinRef.current(),
      getCoverageRef.current(),
      getLastCheckinRef.current(),
    ]);

    setStatus(await computeStatus(today, coverage, lastCheckin, todayStr));
    setIsLoading(false);
  }, [timezone, computeStatus]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!userId) return;
        const todayStr = getLocalDateISO(timezone);
        const [today, coverage, lastCheckin] = await Promise.all([
          getTodaysCheckinRef.current(),
          getCoverageRef.current(),
          getLastCheckinRef.current(),
        ]);

        if (cancelled) return;

        setStatus(await computeStatus(today, coverage, lastCheckin, todayStr));
      } catch (err) {
        console.error('Failed to fetch checkin status:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, timezone, frequency, computeStatus]);

  return { ...status, isLoading, refresh };
}
