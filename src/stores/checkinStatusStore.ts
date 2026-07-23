import { create } from 'zustand';
import {
  computeCheckinStatus,
  EMPTY_CHECKIN_STATUS,
  loadCheckinStatusSnapshot,
  type CheckinStatus,
} from '../hooks/checkinStatus';
import { useAuthStore } from './authStore';
import { getLocalDateISO, getResolvedTimezone } from '../utils/checkinHelpers';

interface CheckinStatusState {
  status: CheckinStatus;
  isLoading: boolean;
  userId: string | null;
  todayStr: string | null;
  checkinDay: number | null;
  /** Bumped each refresh; stale async resolutions are ignored. */
  loadId: number;
  /**
   * Load (or reload) shared check-in status.
   * Concurrent calls with the same inputs share one in-flight request.
   */
  refresh: (
    userId: string | null | undefined,
    todayStr: string,
    checkinDay: number | null,
    options?: { preserveOnError?: boolean; force?: boolean },
  ) => Promise<void>;
}

let inFlight: Promise<void> | null = null;
let inFlightKey: string | null = null;
let loadedKey: string | null = null;

function inputsKey(
  userId: string | null | undefined,
  todayStr: string,
  checkinDay: number | null,
): string {
  return `${userId ?? 'anon'}|${todayStr}|${checkinDay ?? 'none'}`;
}

export const useCheckinStatusStore = create<CheckinStatusState>((set, get) => ({
  status: EMPTY_CHECKIN_STATUS,
  isLoading: true,
  userId: null,
  todayStr: null,
  checkinDay: null,
  loadId: 0,

  refresh: async (userId, todayStr, checkinDay, options = {}) => {
    const preserveOnError = options.preserveOnError ?? false;
    const force = options.force ?? false;
    const key = inputsKey(userId, todayStr, checkinDay);

    if (!userId) {
      loadedKey = null;
      inFlight = null;
      inFlightKey = null;
      set({
        status: EMPTY_CHECKIN_STATUS,
        isLoading: false,
        userId: null,
        todayStr,
        checkinDay,
      });
      return;
    }

    if (!force && loadedKey === key && !get().isLoading) {
      return;
    }

    if (inFlight && inFlightKey === key) {
      return inFlight;
    }

    const loadId = get().loadId + 1;
    set({
      loadId,
      isLoading: true,
      userId,
      todayStr,
      checkinDay,
      ...(preserveOnError ? {} : { status: EMPTY_CHECKIN_STATUS }),
    });

    const request = (async () => {
      try {
        const snapshot = await loadCheckinStatusSnapshot(userId, todayStr);
        if (loadId !== get().loadId) return;
        set({
          status: computeCheckinStatus(snapshot, todayStr, checkinDay),
          isLoading: false,
        });
        loadedKey = key;
      } catch (err) {
        if (loadId !== get().loadId) return;
        console.error('Failed to fetch checkin status:', err);
        if (!preserveOnError) {
          set({ status: EMPTY_CHECKIN_STATUS });
        }
        set({ isLoading: false });
      } finally {
        if (inFlightKey === key) {
          inFlight = null;
          inFlightKey = null;
        }
      }
    })();

    inFlight = request;
    inFlightKey = key;
    await request;
  },
}));

/** Force-refresh from auth profile (save path, visibility). */
export function refreshCheckinStatusForCurrentUser(): Promise<void> {
  const { user, profile } = useAuthStore.getState();
  const timezone = getResolvedTimezone(profile?.timezone);
  const todayStr = getLocalDateISO(timezone);
  return useCheckinStatusStore
    .getState()
    .refresh(user?.id, todayStr, profile?.checkin_day ?? null, {
      preserveOnError: true,
      force: true,
    });
}
