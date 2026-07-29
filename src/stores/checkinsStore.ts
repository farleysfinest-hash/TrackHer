import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { refreshCheckinStatusForCurrentUser } from './checkinStatusStore';
import { resyncRemindersForCurrentUser } from '../hooks/useReminderSync';
import type {
  SymptomCheckin,
  ExtendedSymptomLog,
} from '../types/database';
import {
  getLocalDateISO,
  getResolvedTimezone,
} from '../utils/checkinHelpers';
import {
  persistCheckinBundle,
} from '../hooks/checkinPersistence';
import { addDaysISO, addMonthsISO } from '../utils/localDate';
import type { FetchOptions } from './medicationsStore';
import {
  buildAssessmentPayload,
  buildCheckinPayload,
  getCheckinErrorMessage,
  type CheckinInput,
} from './checkinPayload';
import {
  loadMinimalAiContextForMonitor,
  triggerAiMonitorAfterMrsCheckin,
} from '../utils/aiMonitorTrigger';

export type { CheckinInput } from './checkinPayload';

const DEFAULT_CHECKINS_LIMIT = 50;

function getUserId() {
  return useAuthStore.getState().user?.id;
}

function getTimezone() {
  return getResolvedTimezone(useAuthStore.getState().profile?.timezone);
}

interface CheckinsState {
  checkins: SymptomCheckin[];
  mrsCheckinCount: number;
  earliestCheckinDate: string | null;
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  /** Largest `limit` fetched so far, so a smaller request can be served from cache. */
  fetchedLimit: number;
  fetchCheckins: (limit?: number, options?: FetchOptions) => Promise<void>;
  fetchCheckinsRange: (start: string, end: string) => Promise<void>;
  fetchCheckinsPage: (
    offset: number,
    pageSize?: number,
  ) => Promise<{ data: SymptomCheckin[]; hasMore: boolean }>;
  fetchCheckinDetail: (
    id: string,
  ) => Promise<{ checkin: SymptomCheckin; extendedSymptoms: ExtendedSymptomLog[] } | null>;
  getLastCheckin: () => Promise<SymptomCheckin | null>;
  getTodaysCheckin: () => Promise<SymptomCheckin | null>;
  getCheckinForDate: (date: string) => Promise<SymptomCheckin | null>;
  getCoverage: () => Promise<{ covered: number; window: number } | null>;
  createCheckin: (data: CheckinInput) => Promise<SymptomCheckin | null>;
  updateCheckin: (id: string, data: CheckinInput) => Promise<boolean>;
  deleteCheckin: (id: string) => Promise<boolean>;
  getStreak: () => Promise<number>;
  reset: () => void;
}

/**
 * Separate generation counters so prefetch / insights `fetchCheckins` and
 * dashboard `fetchCheckinsRange` cannot cancel each other. Sharing one counter
 * left mrsCheckinCount stuck at 0 (early dashboard / welcome / unlock) whenever
 * a list fetch finished after the range fetch had been superseded.
 */
let latestListRequest = 0;
let latestRangeRequest = 0;
const inFlightByKey = new Map<string, Promise<void>>();

export const useCheckinsStore = create<CheckinsState>((set, get) => ({
  checkins: [],
  mrsCheckinCount: 0,
  earliestCheckinDate: null,
  isLoading: true,
  error: null,
  hasFetched: false,
  fetchedLimit: 0,

  reset: () => {
    latestListRequest += 1;
    latestRangeRequest += 1;
    inFlightByKey.clear();
    set({
      checkins: [],
      mrsCheckinCount: 0,
      earliestCheckinDate: null,
      isLoading: false,
      error: null,
      hasFetched: false,
      fetchedLimit: 0,
    });
  },

  fetchCheckins: async (limitArg, options) => {
    const force = options?.force ?? false;
    const userId = getUserId();
    if (!userId) return;

    const limit = limitArg ?? Math.max(get().fetchedLimit, DEFAULT_CHECKINS_LIMIT);
    if (get().hasFetched && !force && limit <= get().fetchedLimit) return;

    const key = `checkins:${limit}`;
    const inFlight = inFlightByKey.get(key);
    if (inFlight) {
      await inFlight;
      if (force) {
        // Prior request may have started before our write; force a fresh pass.
        return get().fetchCheckins(limit, { force: true });
      }
      return;
    }

    const promise = (async () => {
      const requestId = ++latestListRequest;
      set({ isLoading: true, error: null });

      const [listResult, countResult] = await Promise.all([
        supabase
          .from('symptom_checkins')
          .select('*')
          .eq('user_id', userId)
          .order('checkin_date', { ascending: false })
          .limit(limit),
        supabase
          .from('symptom_checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('mrs_complete', true),
      ]);

      if (requestId !== latestListRequest) return;
      if (listResult.error) {
        set({ isLoading: false, error: listResult.error.message });
        return;
      }
      set({
        checkins: (listResult.data as SymptomCheckin[]) ?? [],
        mrsCheckinCount: countResult.error ? get().mrsCheckinCount : (countResult.count ?? 0),
        isLoading: false,
        hasFetched: true,
        fetchedLimit: Math.max(get().fetchedLimit, limit),
      });
    })();

    inFlightByKey.set(key, promise);
    try {
      await promise;
    } finally {
      inFlightByKey.delete(key);
    }
  },

  fetchCheckinsRange: async (start, end) => {
    const userId = getUserId();
    if (!userId) return;

    const key = `range:${start}:${end}`;
    const inFlight = inFlightByKey.get(key);
    if (inFlight) {
      await inFlight;
      return;
    }

    const promise = (async () => {
      const requestId = ++latestRangeRequest;
      set({ isLoading: true, error: null });

      const [countResult, earliestResult] = await Promise.all([
        supabase
          .from('symptom_checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('mrs_complete', true),
        supabase
          .from('symptom_checkins')
          .select('checkin_date')
          .eq('user_id', userId)
          .order('checkin_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (countResult.error || earliestResult.error) {
        if (requestId !== latestRangeRequest) return;
        set({
          isLoading: false,
          error:
            countResult.error?.message ?? earliestResult.error?.message ?? 'Failed to load check-in summary',
        });
        return;
      }

      const pageSize = 500;
      const rows: SymptomCheckin[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error: pageError } = await supabase
          .from('symptom_checkins')
          .select('*')
          .eq('user_id', userId)
          .gte('checkin_date', start)
          .lte('checkin_date', end)
          .order('checkin_date', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (pageError) {
          if (requestId !== latestRangeRequest) return;
          set({ isLoading: false, error: pageError.message });
          return;
        }

        const page = (data as SymptomCheckin[]) ?? [];
        rows.push(...page);
        if (page.length < pageSize) break;
        if (requestId !== latestRangeRequest) return;
      }

      if (requestId !== latestRangeRequest) return;
      set({
        mrsCheckinCount: countResult.count ?? 0,
        earliestCheckinDate:
          (earliestResult.data as { checkin_date: string } | null)?.checkin_date ?? null,
        checkins: rows,
        isLoading: false,
        hasFetched: true,
        // Keep list prefetch from immediately re-fetching a shorter window.
        fetchedLimit: Math.max(get().fetchedLimit, rows.length, DEFAULT_CHECKINS_LIMIT),
      });
    })();

    inFlightByKey.set(key, promise);
    try {
      await promise;
    } finally {
      inFlightByKey.delete(key);
    }
  },

  fetchCheckinsPage: async (offset, pageSize = 10) => {
    const userId = getUserId();
    if (!userId) return { data: [], hasMore: false };

    const { data, error: fetchError } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (fetchError) {
      set({ error: fetchError.message });
      return { data: [], hasMore: false };
    }

    const rows = (data as SymptomCheckin[]) ?? [];
    return { data: rows, hasMore: rows.length === pageSize };
  },

  fetchCheckinDetail: async (id) => {
    const userId = getUserId();
    if (!userId) return null;

    const { data: checkin, error: checkinError } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkinError || !checkin) return null;

    const { data: extended } = await supabase
      .from('extended_symptom_logs')
      .select('*')
      .eq('checkin_id', id)
      .eq('user_id', userId);

    return {
      checkin: checkin as SymptomCheckin,
      extendedSymptoms: (extended as ExtendedSymptomLog[]) ?? [],
    };
  },

  getLastCheckin: async () => {
    const userId = getUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? (data as SymptomCheckin) : null;
  },

  getTodaysCheckin: async () => {
    const today = getLocalDateISO(getTimezone());
    return get().getCheckinForDate(today);
  },

  getCheckinForDate: async (date) => {
    const userId = getUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('checkin_date', date)
      .maybeSingle();

    return data ? (data as SymptomCheckin) : null;
  },

  getCoverage: async () => {
    const frequency = useAuthStore.getState().profile?.checkin_frequency ?? 'daily';
    if (frequency !== 'daily') return null;

    const window = 14;
    const timezone = getTimezone();
    const today = getLocalDateISO(timezone);
    const since = addDaysISO(today, -(window - 1));

    const userId = getUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('symptom_checkins')
      .select('checkin_date')
      .eq('user_id', userId)
      .gte('checkin_date', since)
      .lte('checkin_date', today);

    const dates = new Set((data ?? []).map((d) => d.checkin_date as string));
    return { covered: dates.size, window };
  },

  createCheckin: async (data) => {
    const userId = getUserId();
    if (!userId) return null;

    const payload = buildCheckinPayload(
      { ...data, checkinDate: data.checkinDate ?? getLocalDateISO(getTimezone()) },
      getTimezone(),
    );
    const checkinDate = payload.checkin_date as string;

    try {
      set({ error: null });
      const checkin = await persistCheckinBundle({
        checkinId: null,
        checkinDate,
        checkinPayload: payload,
        extendedSymptoms: data.extendedSymptoms.map((symptom) => ({
          symptom_key: symptom.symptom_key,
          severity_score: symptom.severity,
        })),
        assessment: buildAssessmentPayload(data, checkinDate),
      });

      await get().fetchCheckins(undefined, { force: true });
      void (async () => {
        await refreshCheckinStatusForCurrentUser();
        await resyncRemindersForCurrentUser();
      })();
      if (payload.checkin_type !== 'pulse' && payload.mrs_complete === true) {
        void loadMinimalAiContextForMonitor(userId, getTimezone()).then((ctx) => {
          if (ctx) triggerAiMonitorAfterMrsCheckin(ctx);
        });
      }
      return checkin;
    } catch (saveError) {
      set({ error: getCheckinErrorMessage(saveError) });
      return null;
    }
  },

  updateCheckin: async (id, data) => {
    const userId = getUserId();
    if (!userId) return false;

    const payload = buildCheckinPayload(data, getTimezone());
    const existingCheckin = get().checkins.find((c) => c.id === id);
    const checkinDate =
      existingCheckin?.checkin_date ?? data.checkinDate ?? getLocalDateISO(getTimezone());

    try {
      set({ error: null });
      await persistCheckinBundle({
        checkinId: id,
        checkinDate,
        checkinPayload: payload,
        extendedSymptoms: data.extendedSymptoms.map((symptom) => ({
          symptom_key: symptom.symptom_key,
          severity_score: symptom.severity,
        })),
        assessment: buildAssessmentPayload(data, checkinDate),
      });

      await get().fetchCheckins(undefined, { force: true });
      void (async () => {
        await refreshCheckinStatusForCurrentUser();
        await resyncRemindersForCurrentUser();
      })();
      if (payload.checkin_type !== 'pulse' && payload.mrs_complete === true) {
        void loadMinimalAiContextForMonitor(userId, getTimezone()).then((ctx) => {
          if (ctx) triggerAiMonitorAfterMrsCheckin(ctx);
        });
      }
      return true;
    } catch (saveError) {
      set({ error: getCheckinErrorMessage(saveError) });
      return false;
    }
  },

  deleteCheckin: async (id) => {
    const userId = getUserId();
    if (!userId) {
      set({ error: 'Not authenticated' });
      return false;
    }
    const { error: deleteError } = await supabase
      .from('symptom_checkins')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (deleteError) {
      set({ error: deleteError.message });
      return false;
    }
    await get().fetchCheckins(undefined, { force: true });
    void (async () => {
      await refreshCheckinStatusForCurrentUser();
      await resyncRemindersForCurrentUser();
    })();
    return true;
  },

  getStreak: async () => {
    const userId = getUserId();
    if (!userId) return 0;

    const frequency = useAuthStore.getState().profile?.checkin_frequency ?? 'daily';
    const timezone = getTimezone();

    const { data } = await supabase
      .from('symptom_checkins')
      .select('checkin_date')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(400);

    if (!data || data.length === 0) return 0;

    const uniqueDates = new Set(
      (data as { checkin_date: string }[]).map((d) => d.checkin_date),
    );
    const uniqueDatesArray = [...uniqueDates];

    if (frequency === 'daily') {
      let streak = 0;
      const today = getLocalDateISO(timezone);
      let cursorDate = today;

      for (let i = 0; i < 365; i++) {
        if (uniqueDates.has(cursorDate)) {
          streak++;
          cursorDate = addDaysISO(cursorDate, -1);
        } else if (i === 0) {
          cursorDate = addDaysISO(cursorDate, -1);
          continue;
        } else {
          break;
        }
      }
      return streak;
    }

    if (frequency === 'weekly') {
      let streak = 0;
      const today = getLocalDateISO(timezone);
      for (let w = 0; w < 52; w++) {
        const weekEnd = addDaysISO(today, -w * 7);
        const weekStart = addDaysISO(weekEnd, -6);
        const hasCheckin = uniqueDatesArray.some((d) => d >= weekStart && d <= weekEnd);
        if (hasCheckin) streak++;
        else if (w > 0) break;
      }
      return streak;
    }

    let streak = 0;
    const today = getLocalDateISO(timezone);
    const firstOfMonth = `${today.slice(0, 7)}-01`;
    for (let m = 0; m < 24; m++) {
      const key = addMonthsISO(firstOfMonth, -m).slice(0, 7);
      const hasCheckin = uniqueDatesArray.some((d) => d.slice(0, 7) === key);
      if (hasCheckin) streak++;
      else if (m > 0) break;
    }
    return streak;
  },
}));
