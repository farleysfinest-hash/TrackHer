import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { MedicationAdministration } from '../types/database';
import { getActiveTimezone, getEventLocalMetadata } from '../utils/localDate';
import { DOSE_HISTORY_DAYS } from '../utils/doseSchedule';
import { fetchAllPages } from '../utils/pagedQuery';

interface FetchRecentOptions {
  force?: boolean;
  /** Expand/cache refresh without flipping global loading spinners. */
  silent?: boolean;
}

interface AdministrationsState {
  administrations: MedicationAdministration[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  fetchedDays: number;
  fetchRecent: (days?: number, opts?: FetchRecentOptions) => Promise<void>;
  logAdministration: (
    medicationId: string,
    takenAt?: string,
  ) => Promise<MedicationAdministration | null>;
  undoLast: (medicationId: string) => Promise<boolean>;
  reset: () => void;
}

const getUserId = () => useAuthStore.getState().user?.id;

let inFlight: Promise<void> | null = null;

export const useAdministrationsStore = create<AdministrationsState>((set, get) => ({
  administrations: [],
  isLoading: true,
  error: null,
  hasFetched: false,
  fetchedDays: 0,

  reset: () => {
    inFlight = null;
    set({
      administrations: [],
      isLoading: false,
      error: null,
      hasFetched: false,
      fetchedDays: 0,
    });
  },

  fetchRecent: async (days = DOSE_HISTORY_DAYS, opts) => {
    const force = opts?.force ?? false;
    const silent = opts?.silent ?? false;
    const userId = getUserId();
    if (!userId) {
      set({ administrations: [], isLoading: false, hasFetched: false, fetchedDays: 0 });
      return;
    }

    const { hasFetched, fetchedDays } = get();
    if (hasFetched && !force && days <= fetchedDays) return;

    if (inFlight) {
      await inFlight;
      if (force || days > get().fetchedDays) {
        return get().fetchRecent(days, opts);
      }
      return;
    }

    const promise = (async () => {
      if (!silent || !get().hasFetched) {
        set({ isLoading: true, error: null });
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffISO = cutoff.toISOString();

      try {
        const rows = await fetchAllPages<MedicationAdministration>(async (from, to) => {
          const { data, error: fetchError } = await supabase
            .from('medication_administrations')
            .select('*')
            .eq('user_id', userId)
            .gte('taken_at', cutoffISO)
            .order('taken_at', { ascending: false })
            .range(from, to);
          return { data: data as MedicationAdministration[] | null, error: fetchError };
        });
        if (getUserId() !== userId) return;
        set({
          administrations: rows,
          isLoading: false,
          hasFetched: true,
          fetchedDays: Math.max(get().fetchedDays, days),
          error: null,
        });
      } catch (e) {
        if (getUserId() !== userId) return;
        set({
          isLoading: false,
          error: e instanceof Error ? e.message : 'Failed to load doses',
        });
      }
    })();

    inFlight = promise;
    try {
      await promise;
    } finally {
      if (inFlight === promise) inFlight = null;
    }
  },

  logAdministration: async (medicationId, takenAt) => {
    const userId = getUserId();
    if (!userId) return null;

    const takenAtISO = takenAt ?? new Date().toISOString();
    const preferredTimezone = useAuthStore.getState().profile?.timezone;
    const metadata = getEventLocalMetadata(takenAtISO, getActiveTimezone(preferredTimezone));

    const { data, error: insertError } = await supabase
      .from('medication_administrations')
      .insert({
        medication_id: medicationId,
        taken_at: takenAtISO,
        event_timezone: metadata.timezone,
        local_date: metadata.localDate,
        utc_offset_minutes: metadata.utcOffsetMinutes,
        user_id: userId,
      })
      .select()
      .single();

    if (insertError) {
      set({ error: insertError.message });
      return null;
    }

    const created = data as MedicationAdministration;
    set((s) => ({ administrations: [created, ...s.administrations] }));
    window.dispatchEvent(new CustomEvent('trackher:doses-changed'));
    return created;
  },

  undoLast: async (medicationId) => {
    const latest = get()
      .administrations.filter((a) => a.medication_id === medicationId)
      .sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];

    if (!latest) return false;

    const userId = getUserId();
    if (!userId) return false;

    const { error: deleteError } = await supabase
      .from('medication_administrations')
      .delete()
      .eq('id', latest.id)
      .eq('user_id', userId);

    if (deleteError) {
      set({ error: deleteError.message });
      return false;
    }

    set((s) => ({
      administrations: s.administrations.filter((a) => a.id !== latest.id),
    }));
    window.dispatchEvent(new CustomEvent('trackher:doses-changed'));
    return true;
  },
}));

function refreshAdministrationsSilently() {
  void useAdministrationsStore
    .getState()
    .fetchRecent(DOSE_HISTORY_DAYS, { silent: true, force: true });
}

if (typeof window !== 'undefined') {
  // Dose log/undo already update this store optimistically. Refresh when the
  // regimen changes; clear on account reset.
  window.addEventListener('trackher:medications-changed', refreshAdministrationsSilently);
  window.addEventListener('trackher:account-reset', () => {
    useAdministrationsStore.getState().reset();
  });
}
