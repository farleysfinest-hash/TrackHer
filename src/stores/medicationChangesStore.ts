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
let medicationChangesFetchGeneration = 0;
let medicationChangesForceQueued = false;

export const useMedicationChangesStore = create<MedicationChangesState>((set, get) => ({
  changes: [],
  isLoading: false,
  error: null,
  hasFetched: false,

  reset: () => {
    medicationChangesFetchGeneration += 1;
    fetchChangesPromise = null;
    medicationChangesForceQueued = false;
    set({ changes: [], isLoading: false, error: null, hasFetched: false });
  },

  fetchChanges: async (options) => {
    const force = options?.force ?? false;
    const userId = getUserId();
    if (!userId) return;

    if (fetchChangesPromise) {
      if (force) medicationChangesForceQueued = true;
      await fetchChangesPromise;
      if (medicationChangesForceQueued) {
        medicationChangesForceQueued = false;
        await get().fetchChanges({ force: true });
      }
      return;
    }
    if (get().hasFetched && !force) return;

    const generation = medicationChangesFetchGeneration;
    fetchChangesPromise = (async () => {
      set({ isLoading: true, error: null });

      const { data: changesData, error: fetchError } = await supabase
        .from('medication_changes')
        .select('*')
        .eq('user_id', userId)
        .order('change_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (generation !== medicationChangesFetchGeneration || getUserId() !== userId) return;

      if (fetchError) {
        set({ isLoading: false, error: fetchError.message });
        return;
      }

      const { data: medsData } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId);

      if (generation !== medicationChangesFetchGeneration || getUserId() !== userId) return;

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
