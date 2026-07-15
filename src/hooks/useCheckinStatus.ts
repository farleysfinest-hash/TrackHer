import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  computeCheckinStatus,
  EMPTY_CHECKIN_STATUS,
  loadCheckinStatusSnapshot,
  type CheckinStatus,
} from './checkinStatus';
import { getLocalDateISO, getResolvedTimezone } from '../utils/checkinHelpers';

export function useCheckinStatus() {
  const userId = useAuthStore((s) => s.user?.id);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const checkinDay = useAuthStore((s) => s.profile?.checkin_day ?? null);

  const [status, setStatus] = useState<CheckinStatus>(EMPTY_CHECKIN_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const loadIdRef = useRef(0);

  const loadStatus = useCallback(
    async (options: { preserveOnError?: boolean } = {}) => {
      const loadId = ++loadIdRef.current;
      const preserveOnError = options.preserveOnError ?? false;

      if (!userId) {
        setStatus(EMPTY_CHECKIN_STATUS);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      if (!preserveOnError) {
        setStatus(EMPTY_CHECKIN_STATUS);
      }

      const todayStr = getLocalDateISO(timezone);

      try {
        const snapshot = await loadCheckinStatusSnapshot(userId, todayStr);
        if (loadId !== loadIdRef.current) return;
        setStatus(computeCheckinStatus(snapshot, todayStr, checkinDay));
      } catch (err) {
        if (loadId !== loadIdRef.current) return;

        console.error('Failed to fetch checkin status:', err);

        if (!preserveOnError) {
          setStatus(EMPTY_CHECKIN_STATUS);
        }
      } finally {
        if (loadId === loadIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [userId, timezone, checkinDay],
  );

  const refresh = useCallback(async () => {
    await loadStatus({ preserveOnError: true });
  }, [loadStatus]);

  useEffect(() => {
    void loadStatus({ preserveOnError: false });

    return () => {
      loadIdRef.current += 1;
    };
  }, [loadStatus]);

  return { ...status, isLoading, refresh };
}
