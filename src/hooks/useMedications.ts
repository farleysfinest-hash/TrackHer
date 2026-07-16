import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
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

async function fetchMedicationById(id: string): Promise<Medication | null> {
  const { data, error } = await supabase.from('medications').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as Medication;
}

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchMedications = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('start_date', { ascending: false });

    setIsLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setMedications((data as Medication[]) ?? []);
  }, []);

  const fetchActiveMedications = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    setIsLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setMedications((data as Medication[]) ?? []);
  }, []);

  const addMedication = async (data: MedicationInsert): Promise<AddMedicationResult> => {
    const userId = getUserId();
    if (!userId) {
      const message = 'Not authenticated';
      setError(message);
      return { medication: null, error: message };
    }

    setError(null);
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
        setError(insertError.message);
        return { medication: null, error: insertError.message };
      }

      const medication = inserted as Medication;

      await fetchMedications();
      return { medication };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to add medication';
      console.error('addMedication threw:', e);
      setError(message);
      return { medication: null, error: message };
    }
  };

  const updateMedication = async (
    id: string,
    updates: MedicationUpdate,
  ): Promise<boolean> => {
    const { error: updateError } = await supabase.from('medications').update(updates).eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchMedications();
    return true;
  };

  const changeRegimen = async (
    id: string,
    update: MedicationRegimenUpdate,
    effectiveDate = todayISO(),
    notes?: string,
  ): Promise<MedicationMutationResult> => {
    const userId = getUserId();
    if (!userId) {
      const message = 'Not authenticated';
      setError(message);
      return { ok: false, error: message };
    }

    const currentMed = await fetchMedicationById(id);
    if (!currentMed) {
      const message = 'Medication not found';
      setError(message);
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
      setError(commandError.message);
      return { ok: false, error: commandError.message };
    }

    await fetchMedications();
    return { ok: true };
  };

  const changeDose = async (
    id: string,
    update: MedicationDoseUpdate,
    effectiveDate?: string,
    notes?: string,
  ): Promise<MedicationMutationResult> =>
    changeRegimen(
      id,
      { ...update, doseChanged: true, frequencyChanged: false },
      effectiveDate,
      notes,
    );

  const changeFrequency = async (
    id: string,
    newFrequency: MedicationFrequency,
    frequencyDetails?: Record<string, unknown>,
    effectiveDate?: string,
    notes?: string,
  ): Promise<MedicationMutationResult> => {
    const currentMed = await fetchMedicationById(id);
    if (!currentMed) {
      const message = 'Medication not found';
      setError(message);
      return { ok: false, error: message };
    }
    return changeRegimen(
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
  };

  const discontinueMedication = async (
    id: string,
    endDate: string,
    reason?: string,
  ): Promise<MedicationMutationResult> => {
    const userId = getUserId();
    if (!userId) {
      const message = 'Not authenticated';
      setError(message);
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
      setError(commandError.message);
      return { ok: false, error: commandError.message };
    }

    await fetchMedications();
    return { ok: true };
  };

  const reactivateMedication = async (id: string): Promise<boolean> => {
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
      setError(commandError.message);
      return false;
    }

    await fetchMedications();
    return true;
  };

  const deleteMedication = async (id: string): Promise<boolean> => {
    const { error: commandError } = await supabase.rpc('save_medication_command', {
      p_action: 'delete',
      p_medication_id: id,
      p_payload: {},
      p_change_date: null,
      p_notes: null,
      p_expected_updated_at: null,
    });

    if (commandError) {
      setError(commandError.message);
      return false;
    }

    await fetchMedications();
    return true;
  };

  return {
    medications,
    isLoading,
    error,
    fetchMedications,
    fetchActiveMedications,
    addMedication,
    updateMedication,
    changeDose,
    changeFrequency,
    changeRegimen,
    discontinueMedication,
    reactivateMedication,
    deleteMedication,
  };
}
