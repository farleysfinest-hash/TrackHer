import { create } from 'zustand';
import type { HealthSnapshot } from '../lib/healthKit';
import {
  isHealthAvailable,
  requestHealthAuthorization,
  fetchHealthSnapshot,
} from '../lib/healthKit';

interface HealthState {
  /** Whether the device supports HealthKit / Health Connect. */
  available: boolean | null;
  /** Whether the user has enabled Apple Health sync in TrackHer settings. */
  enabled: boolean;
  /** Whether we've successfully requested authorization this session. */
  authorized: boolean;
  /** Most recent snapshot of health data. */
  snapshot: HealthSnapshot | null;
  /** True while a fetch is in progress. */
  loading: boolean;

  /** Check device availability. Called once at app start. */
  checkAvailability: () => Promise<void>;
  /** Toggle health sync on/off. Requests authorization when enabling. */
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Fetch latest health data. No-op if not enabled/authorized. */
  refresh: () => Promise<void>;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  available: null,
  enabled: false,
  authorized: false,
  snapshot: null,
  loading: false,

  checkAvailability: async () => {
    const available = await isHealthAvailable();
    set({ available });
  },

  setEnabled: async (enabled) => {
    if (enabled) {
      const ok = await requestHealthAuthorization();
      set({ enabled: true, authorized: ok });
      if (ok) {
        await get().refresh();
      }
    } else {
      set({ enabled: false, snapshot: null });
    }
  },

  refresh: async () => {
    const { enabled, authorized } = get();
    if (!enabled || !authorized) return;
    set({ loading: true });
    try {
      const snapshot = await fetchHealthSnapshot();
      set({ snapshot });
    } finally {
      set({ loading: false });
    }
  },
}));
