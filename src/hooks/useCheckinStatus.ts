import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCheckinStatusStore } from '../stores/checkinStatusStore';
import { getResolvedTimezone } from '../utils/checkinHelpers';
import { useLocalToday } from './useLocalToday';

export function useCheckinStatus() {
  const userId = useAuthStore((s) => s.user?.id);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const todayStr = useLocalToday(timezone);
  const checkinDay = useAuthStore((s) => s.profile?.checkin_day ?? null);

  const status = useCheckinStatusStore((s) => s.status);
  const isLoading = useCheckinStatusStore((s) => s.isLoading);
  const storeRefresh = useCheckinStatusStore((s) => s.refresh);

  useEffect(() => {
    void storeRefresh(userId, todayStr, checkinDay, { preserveOnError: false });
  }, [userId, todayStr, checkinDay, storeRefresh]);

  const refresh = useCallback(async () => {
    await storeRefresh(userId, todayStr, checkinDay, {
      preserveOnError: true,
      force: true,
    });
  }, [storeRefresh, userId, todayStr, checkinDay]);

  return { ...status, isLoading, refresh };
}
