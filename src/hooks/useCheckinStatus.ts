import { useState, useCallback, useEffect, useRef } from 'react';
import { useCheckins } from './useCheckins';
import { useAuthStore } from '../stores/authStore';
import type { SymptomCheckin } from '../types/database';
import { getLocalDateISO } from '../utils/checkinHelpers';

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function sameCalendarMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function useCheckinStatus() {
  const { getTodaysCheckin, getLastCheckin, getStreak } = useCheckins();
  const timezone = useAuthStore((s) => s.profile?.timezone ?? 'America/Los_Angeles');
  const frequency = useAuthStore((s) => s.profile?.checkin_frequency ?? 'daily');

  const getTodaysCheckinRef = useRef(getTodaysCheckin);
  getTodaysCheckinRef.current = getTodaysCheckin;
  const getLastCheckinRef = useRef(getLastCheckin);
  getLastCheckinRef.current = getLastCheckin;
  const getStreakRef = useRef(getStreak);
  getStreakRef.current = getStreak;

  const [status, setStatus] = useState({
    hasCheckedInToday: false,
    todaysCheckin: null as SymptomCheckin | null,
    streak: 0,
    lastCheckinDate: null as string | null,
    isDue: true,
    daysSinceLastCheckin: null as number | null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const todayStr = getLocalDateISO(timezone);

    const [today, streak, lastCheckin] = await Promise.all([
      getTodaysCheckinRef.current(),
      getStreakRef.current(),
      getLastCheckinRef.current(),
    ]);

    const lastDate = today?.checkin_date ?? lastCheckin?.checkin_date ?? null;
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

    setStatus({
      hasCheckedInToday: !!today,
      todaysCheckin: today,
      streak,
      lastCheckinDate: lastDate,
      isDue,
      daysSinceLastCheckin,
    });
    setIsLoading(false);
  }, [timezone, frequency]);

  useEffect(() => {
    setIsLoading(true);
    void refresh();
  }, [refresh]);

  return { ...status, isLoading, refresh };
}
