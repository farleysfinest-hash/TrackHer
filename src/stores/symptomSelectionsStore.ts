import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { UserSymptomSelection } from '../types/database';

export interface SymptomSelection {
  symptom_id: string;
  is_watch_symptom: boolean;
}

interface SymptomSelectionsState {
  selections: SymptomSelection[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  fetchSelections: (opts?: { force?: boolean }) => Promise<void>;
  saveSelections: (
    newSelections: SymptomSelection[],
    watchSymptoms: string[],
  ) => Promise<boolean>;
  reset: () => void;
}

const getUserId = () => useAuthStore.getState().user?.id;

let inFlight: Promise<void> | null = null;

export const useSymptomSelectionsStore = create<SymptomSelectionsState>((set, get) => ({
  selections: [],
  isLoading: true,
  error: null,
  hasFetched: false,

  reset: () => {
    inFlight = null;
    set({ selections: [], isLoading: false, error: null, hasFetched: false });
  },

  fetchSelections: async (opts) => {
    const force = opts?.force ?? false;
    const userId = getUserId();
    if (!userId) {
      set({ selections: [], isLoading: false, hasFetched: false });
      return;
    }
    if (get().hasFetched && !force) return;

    if (inFlight) {
      await inFlight;
      if (force && !get().hasFetched) return get().fetchSelections({ force: true });
      return;
    }

    const promise = (async () => {
      set({ isLoading: true, error: null });
      const { data, error: fetchError } = await supabase
        .from('user_symptom_selections')
        .select('symptom_id, is_watch_symptom')
        .eq('user_id', userId);

      if (getUserId() !== userId) return;
      if (fetchError) {
        set({ isLoading: false, error: fetchError.message });
        return;
      }
      set({
        selections:
          (data as Pick<UserSymptomSelection, 'symptom_id' | 'is_watch_symptom'>[]) ?? [],
        isLoading: false,
        hasFetched: true,
        error: null,
      });
    })();

    inFlight = promise;
    try {
      await promise;
    } finally {
      if (inFlight === promise) inFlight = null;
    }
  },

  saveSelections: async (newSelections, watchSymptoms) => {
    const userId = getUserId();
    if (!userId) return false;

    const symptomIds = [
      ...new Set([...newSelections.map((s) => s.symptom_id), ...watchSymptoms]),
    ];
    const sanitizedWatchSymptoms = [
      ...new Set(watchSymptoms.length > 0 ? watchSymptoms : symptomIds),
    ].filter((id) => symptomIds.includes(id));

    const { error: saveError } = await supabase.rpc('save_user_symptom_selections', {
      p_symptom_ids: symptomIds,
      p_watch_symptom_ids: sanitizedWatchSymptoms,
    });

    if (saveError) {
      set({ error: saveError.message });
      return false;
    }

    await get().fetchSelections({ force: true });
    return true;
  },
}));
