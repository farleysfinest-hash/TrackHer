import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type {
  Medication,
  MedicationInsert,
  MedicationFrequency,
  MedicationUpdate,
} from '../types/database';
import { getEffectiveDailyDose, todayISO } from '../utils/medicationHelpers';

export interface MedicationDoseUpdate {
  dose_amount: number;
  dose_unit?: string;
  units_per_dose?: number;
  frequency_details?: Record<string, unknown> | null;
}

export interface MedicationRegimenUpdate extends MedicationDoseUpdate {
  frequency?: MedicationFrequency;
  doseChanged: boolean;
  frequencyChanged: boolean;
}

export interface AddMedicationResult {
  medication: Medication | null;
  error?: string;
  changeEventFailed?: boolean;
}

export interface MedicationMutationResult {
  ok: boolean;
  error?: string;
  changeEventFailed?: boolean;
}

export interface FetchOptions {
  force?: boolean;
}

async function fetchMedicationById(id: string): Promise<Medication | null> {
  const { data, error } = await supabase.from('medications').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as Medication;
}

function notifyMedicationsChanged() {
  window.dispatchEvent(new CustomEvent('trackher:medications-changed'));
}

function getUserId() {
  return useAuthStore.getState().user?.id;
}

interface MedicationsState {
  medications: Medication[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  reset: () => void;
  fetchMedications: (options?: FetchOptions) => Promise<void>;
  fetchActiveMedications: (options?: FetchOptions) => Promise<void>;
  addMedication: (data: MedicationInsert) => Promise<AddMedicationResult>;
  updateMedication: (id: string, updates: MedicationUpdate) => Promise<boolean>;
  changeRegimen: (
    id: string,
    update: MedicationRegimenUpdate,
    effectiveDate?: string,
    notes?: string,
  ) => Promise<MedicationMutationResult>;
  changeDose: (
    id: string,
    update: MedicationDoseUpdate,
    effectiveDate?: string,
    notes?: string,
  ) => Promise<MedicationMutationResult>;
  changeFrequency: (
    id: string,
    newFrequency: MedicationFrequency,
    frequencyDetails?: Record<string, unknown>,
    effectiveDate?: string,
    notes?: string,
  ) => Promise<MedicationMutationResult>;
  discontinueMedication: (
    id: string,
    endDate: string,
    reason?: string,
  ) => Promise<MedicationMutationResult>;
  reactivateMedication: (id: string) => Promise<boolean>;
  deleteMedication: (id: string) => Promise<boolean>;
}

let fetchMedicationsPromise: Promise<void> | null = null;

export const useMedicationsStore = create<MedicationsState>((set, get) => ({
  medications: [],
  isLoading: true,
  error: null,
  hasFetched: false,

  reset: () => {
    fetchMedicationsPromise = null;
    set({ medications: [], isLoading: false, error: null, hasFetched: false });
  },

  fetchMedications: async (options) => {
    const force = options?.force ?? false;
    const userId = getUserId();
    if (!userId) return;

    if (fetchMedicationsPromise) {
      await fetchMedicationsPromise;
      return;
    }
    if (get().hasFetched && !force) return;

    fetchMedicationsPromise = (async () => {
      set({ isLoading: true, error: null });

      const { data, error: fetchError } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false });

      if (fetchError) {
        set({ isLoading: false, error: fetchError.message });
        return;
      }
      set({ medications: (data as Medication[]) ?? [], isLoading: false, hasFetched: true });
    })();

    try {
      await fetchMedicationsPromise;
    } finally {
      fetchMedicationsPromise = null;
    }
  },

  // The shared list must stay the full medication set (active + inactive) — the
  // Medications page relies on it. Consumers that only want active meds filter
  // client-side, so this is just an alias onto the full fetch.
  fetchActiveMedications: async (options) => {
    await get().fetchMedications(options);
  },

  addMedication: async (data) => {
    const userId = getUserId();
    if (!userId) {
      const message = 'Not authenticated';
      set({ error: message });
      return { medication: null, error: message };
    }

    set({ error: null });
    try {
      const { data: inserted, error: insertError } = await supabase.rpc(
        'save_medication_command',
        {
          p_action: 'add',
          p_medication_id: null,
          p_payload: { ...data, is_active: data.is_active ?? true },
          p_change_date: null,
          p_notes: null,
          p_expected_updated_at: null,
        },
      );

      if (insertError) {
        set({ error: insertError.message });
        return { medication: null, error: insertError.message };
      }

      const medication = inserted as Medication;

      await get().fetchMedications({ force: true });
      notifyMedicationsChanged();
      return { medication };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to add medication';
      console.error('addMedication threw:', e);
      set({ error: message });
      return { medication: null, error: message };
    }
  },

  updateMedication: async (id, updates) => {
    const { error: updateError } = await supabase.from('medications').update(updates).eq('id', id);

    if (updateError) {
      set({ error: updateError.message });
      return false;
    }

    await get().fetchMedications({ force: true });
    notifyMedicationsChanged();
    return true;
  },

  changeRegimen: async (id, update, effectiveDate = todayISO(), notes) => {
    const userId = getUserId();
    if (!userId) {
      const message = 'Not authenticated';
      set({ error: message });
      return { ok: false, error: message };
    }

    const currentMed = await fetchMedicationById(id);
    if (!currentMed) {
      const message = 'Medication not found';
      set({ error: message });
      return { ok: false, error: message };
    }

    const previousEffective = getEffectiveDailyDose(currentMed);
    const nextMed: Medication = {
      ...currentMed,
      dose_amount: update.dose_amount,
      dose_unit: update.dose_unit ?? currentMed.dose_unit,
      units_per_dose: update.units_per_dose ?? currentMed.units_per_dose ?? 1,
      frequency: update.frequency ?? currentMed.frequency,
      frequency_details:
        update.frequency_details !== undefined
          ? update.frequency_details
          : currentMed.frequency_details,
    };
    const nextEffective = getEffectiveDailyDose(nextMed);
    const payload: Record<string, unknown> = {
      dose_changed: update.doseChanged,
      frequency_changed: update.frequencyChanged,
      previous_effective_dose: previousEffective,
      new_effective_dose: nextEffective,
    };
    if (update.doseChanged) {
      payload.dose_amount = update.dose_amount;
      payload.dose_unit = update.dose_unit ?? currentMed.dose_unit;
      payload.units_per_dose = update.units_per_dose ?? currentMed.units_per_dose ?? 1;
    }
    if (update.frequencyChanged && update.frequency) payload.frequency = update.frequency;
    if (update.frequency_details !== undefined) {
      payload.frequency_details = update.frequency_details;
    }

    const { error: commandError } = await supabase.rpc('save_medication_command', {
      p_action: 'regimen',
      p_medication_id: id,
      p_payload: payload,
      p_change_date: effectiveDate,
      p_notes: notes ?? null,
      p_expected_updated_at: currentMed.updated_at,
    });

    if (commandError) {
      set({ error: commandError.message });
      return { ok: false, error: commandError.message };
    }

    await get().fetchMedications({ force: true });
    notifyMedicationsChanged();
    return { ok: true };
  },

  changeDose: async (id, update, effectiveDate, notes) =>
    get().changeRegimen(
      id,
      { ...update, doseChanged: true, frequencyChanged: false },
      effectiveDate,
      notes,
    ),

  changeFrequency: async (id, newFrequency, frequencyDetails, effectiveDate, notes) => {
    const currentMed = await fetchMedicationById(id);
    if (!currentMed) {
      const message = 'Medication not found';
      set({ error: message });
      return { ok: false, error: message };
    }
    return get().changeRegimen(
      id,
      {
        dose_amount: currentMed.dose_amount,
        dose_unit: currentMed.dose_unit,
        units_per_dose: currentMed.units_per_dose,
        frequency: newFrequency,
        frequency_details: frequencyDetails ?? null,
        doseChanged: false,
        frequencyChanged: true,
      },
      effectiveDate,
      notes,
    );
  },

  discontinueMedication: async (id, endDate, reason) => {
    const userId = getUserId();
    if (!userId) {
      const message = 'Not authenticated';
      set({ error: message });
      return { ok: false, error: message };
    }

    const { error: commandError } = await supabase.rpc('save_medication_command', {
      p_action: 'discontinue',
      p_medication_id: id,
      p_payload: {},
      p_change_date: endDate,
      p_notes: reason ?? null,
      p_expected_updated_at: null,
    });

    if (commandError) {
      set({ error: commandError.message });
      return { ok: false, error: commandError.message };
    }

    await get().fetchMedications({ force: true });
    notifyMedicationsChanged();
    return { ok: true };
  },

  reactivateMedication: async (id) => {
    const userId = getUserId();
    if (!userId) return false;

    const today = todayISO();

    const { error: commandError } = await supabase.rpc('save_medication_command', {
      p_action: 'reactivate',
      p_medication_id: id,
      p_payload: {},
      p_change_date: today,
      p_notes: 'Reactivated',
      p_expected_updated_at: null,
    });

    if (commandError) {
      set({ error: commandError.message });
      return false;
    }

    await get().fetchMedications({ force: true });
    notifyMedicationsChanged();
    return true;
  },

  deleteMedication: async (id) => {
    const { error: commandError } = await supabase.rpc('save_medication_command', {
      p_action: 'delete',
      p_medication_id: id,
      p_payload: {},
      p_change_date: null,
      p_notes: null,
      p_expected_updated_at: null,
    });

    if (commandError) {
      set({ error: commandError.message });
      return false;
    }

    await get().fetchMedications({ force: true });
    notifyMedicationsChanged();
    return true;
  },
}));
