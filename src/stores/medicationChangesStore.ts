import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { MedicationChange, Medication } from '../types/database';
import type { FetchOptions } from './medicationsStore';

export interface MedicationChangeWithMed extends MedicationChange {
  medication?: Medication | null;
}

function getUserId() {
  return useAuthStore.getState().user?.id;
}

interface MedicationChangesState {
  changes: MedicationChangeWithMed[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  reset: () => void;
  fetchChanges: (options?: FetchOptions) => Promise<void>;
}

let fetchChangesPromise: Promise<void> | null = null;

export const useMedicationChangesStore = create<MedicationChangesState>((set, get) => ({
  changes: [],
  isLoading: false,
  error: null,
  hasFetched: false,

  reset: () => {
    fetchChangesPromise = null;
    set({ changes: [], isLoading: false, error: null, hasFetched: false });
  },

  fetchChanges: async (options) => {
    const force = options?.force ?? false;
    const userId = getUserId();
    if (!userId) return;

    if (fetchChangesPromise) {
      await fetchChangesPromise;
      return;
    }
    if (get().hasFetched && !force) return;

    fetchChangesPromise = (async () => {
      set({ isLoading: true, error: null });

      const { data: changesData, error: fetchError } = await supabase
        .from('medication_changes')
        .select('*')
        .eq('user_id', userId)
        .order('change_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        set({ isLoading: false, error: fetchError.message });
        return;
      }

      const { data: medsData } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId);

      const medMap = new Map((medsData as Medication[] | null)?.map((m) => [m.id, m]) ?? []);

      const enriched = ((changesData as MedicationChange[]) ?? []).map((change) => ({
        ...change,
        medication: change.medication_id ? medMap.get(change.medication_id) ?? null : null,
      }));

      set({ changes: enriched, isLoading: false, hasFetched: true });
    })();

    try {
      await fetchChangesPromise;
    } finally {
      fetchChangesPromise = null;
    }
  },
}));
