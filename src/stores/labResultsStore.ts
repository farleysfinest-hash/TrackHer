import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { LabResult } from '../types/database';
import { BIOMARKER_KEYS, getBiomarkerValue } from '../utils/labHelpers';
import type { FetchOptions } from './medicationsStore';

export interface LabResultInput {
  drawDate: string;
  fasting: boolean | null;
  drawTime: string | null;
  labName: string;
  values: Record<string, number | null>;
  notes: string;
}

function buildLabPayload(data: LabResultInput, userId: string) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    draw_date: data.drawDate,
    fasting: data.fasting,
    draw_time: data.drawTime || null,
    lab_name: data.labName || null,
    notes: data.notes || null,
  };

  for (const key of BIOMARKER_KEYS) {
    payload[key] = data.values[key] ?? null;
  }

  return payload;
}

function getUserId() {
  return useAuthStore.getState().user?.id;
}

interface LabResultsState {
  labResults: LabResult[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  reset: () => void;
  fetchLabResults: (options?: FetchOptions) => Promise<void>;
  fetchLabDetail: (id: string) => Promise<LabResult | null>;
  getMostRecentLab: () => Promise<LabResult | null>;
  createLabResult: (data: LabResultInput) => Promise<LabResult | null>;
  updateLabResult: (id: string, data: LabResultInput) => Promise<boolean>;
  deleteLabResult: (id: string) => Promise<boolean>;
  getPreviousValue: (biomarkerKey: string, currentDrawDate: string) => number | null;
}

let fetchLabResultsPromise: Promise<void> | null = null;

export const useLabResultsStore = create<LabResultsState>((set, get) => ({
  labResults: [],
  isLoading: true,
  error: null,
  hasFetched: false,

  reset: () => {
    fetchLabResultsPromise = null;
    set({ labResults: [], isLoading: false, error: null, hasFetched: false });
  },

  fetchLabResults: async (options) => {
    const force = options?.force ?? false;
    const userId = getUserId();
    if (!userId) return;

    if (fetchLabResultsPromise) {
      await fetchLabResultsPromise;
      return;
    }
    if (get().hasFetched && !force) return;

    fetchLabResultsPromise = (async () => {
      set({ isLoading: true, error: null });

      const { data, error: fetchError } = await supabase
        .from('lab_results')
        .select('*')
        .eq('user_id', userId)
        .order('draw_date', { ascending: false });

      if (fetchError) {
        set({ isLoading: false, error: fetchError.message });
        return;
      }
      set({ labResults: (data as LabResult[]) ?? [], isLoading: false, hasFetched: true });
    })();

    try {
      await fetchLabResultsPromise;
    } finally {
      fetchLabResultsPromise = null;
    }
  },

  fetchLabDetail: async (id) => {
    const { data, error: fetchError } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !data) return null;
    return data as LabResult;
  },

  getMostRecentLab: async () => {
    const userId = getUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('draw_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? (data as LabResult) : null;
  },

  createLabResult: async (data) => {
    const userId = getUserId();
    if (!userId) return null;

    const payload = buildLabPayload(data, userId);
    const { data: inserted, error: insertError } = await supabase
      .from('lab_results')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      set({ error: insertError.message });
      return null;
    }

    await get().fetchLabResults({ force: true });
    return inserted as LabResult;
  },

  updateLabResult: async (id, data) => {
    const userId = getUserId();
    if (!userId) return false;

    const payload = buildLabPayload(data, userId);
    delete payload.user_id;

    const { error: updateError } = await supabase
      .from('lab_results')
      .update(payload)
      .eq('id', id);

    if (updateError) {
      set({ error: updateError.message });
      return false;
    }

    await get().fetchLabResults({ force: true });
    return true;
  },

  deleteLabResult: async (id) => {
    const { error: deleteError } = await supabase.from('lab_results').delete().eq('id', id);
    if (deleteError) {
      set({ error: deleteError.message });
      return false;
    }
    await get().fetchLabResults({ force: true });
    return true;
  },

  getPreviousValue: (biomarkerKey, currentDrawDate) => {
    const olderLabs = get()
      .labResults.filter((l) => l.draw_date < currentDrawDate)
      .sort((a, b) => b.draw_date.localeCompare(a.draw_date));
    if (olderLabs.length === 0) return null;
    return getBiomarkerValue(olderLabs[0], biomarkerKey);
  },
}));
