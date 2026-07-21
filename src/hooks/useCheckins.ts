import { useCheckinsStore } from '../stores/checkinsStore';

export type { CheckinInput } from '../stores/checkinsStore';

/**
 * Check-ins are shared across the dashboard, checkin flow, charts, and insights —
 * state lives in `useCheckinsStore` so it's fetched once per session, not once per consumer.
 */
export function useCheckins() {
  const checkins = useCheckinsStore((s) => s.checkins);
  const mrsCheckinCount = useCheckinsStore((s) => s.mrsCheckinCount);
  const earliestCheckinDate = useCheckinsStore((s) => s.earliestCheckinDate);
  const isLoading = useCheckinsStore((s) => s.isLoading);
  const error = useCheckinsStore((s) => s.error);
  const fetchCheckins = useCheckinsStore((s) => s.fetchCheckins);
  const fetchCheckinsRange = useCheckinsStore((s) => s.fetchCheckinsRange);
  const fetchCheckinsPage = useCheckinsStore((s) => s.fetchCheckinsPage);
  const fetchCheckinDetail = useCheckinsStore((s) => s.fetchCheckinDetail);
  const getTodaysCheckin = useCheckinsStore((s) => s.getTodaysCheckin);
  const getCheckinForDate = useCheckinsStore((s) => s.getCheckinForDate);
  const getLastCheckin = useCheckinsStore((s) => s.getLastCheckin);
  const createCheckin = useCheckinsStore((s) => s.createCheckin);
  const updateCheckin = useCheckinsStore((s) => s.updateCheckin);
  const deleteCheckin = useCheckinsStore((s) => s.deleteCheckin);
  const getStreak = useCheckinsStore((s) => s.getStreak);
  const getCoverage = useCheckinsStore((s) => s.getCoverage);

  return {
    checkins,
    mrsCheckinCount,
    earliestCheckinDate,
    isLoading,
    error,
    fetchCheckins,
    fetchCheckinsRange,
    fetchCheckinsPage,
    fetchCheckinDetail,
    getTodaysCheckin,
    getCheckinForDate,
    getLastCheckin,
    createCheckin,
    updateCheckin,
    deleteCheckin,
    getStreak,
    getCoverage,
  };
}
