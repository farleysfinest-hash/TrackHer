import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type {
  Medication,
  MedicationInsert,
  MedicationFrequency,
} from '../types/database';
import { getEffectiveDailyDose, todayISO } from '../utils/medicationHelpers';

export interface MedicationDoseUpdate {
  dose_amount: number;
  dose_unit?: string;
  units_per_dose?: number;
  frequency_details?: Record<string, unknown> | null;
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
      // Two-step save: medication row, then its 'started' change event. Partial failure must
      // never report total failure — the retry would duplicate the medication.
      const { data: inserted, error: insertError } = await supabase
        .from('medications')
        .insert({ ...data, user_id: userId, is_active: data.is_active ?? true })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return { medication: null, error: insertError.message };
      }

      const medication = inserted as Medication;

      const { error: changeError } = await supabase.from('medication_changes').insert({
        user_id: userId,
        medication_id: medication.id,
        change_type: 'started',
        new_dose: medication.dose_amount,
        change_date: medication.start_date,
        notes: null,
      });

      if (changeError) {
        console.error('Failed to insert started medication change:', changeError.message);
        await fetchMedications();
        return { medication, changeEventFailed: true };
      }

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
    updates: Partial<MedicationInsert>,
  ): Promise<boolean> => {
    const { error: updateError } = await supabase.from('medications').update(updates).eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchMedications();
    return true;
  };

  const changeDose = async (
    id: string,
    update: MedicationDoseUpdate,
    effectiveDate?: string,
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

    const changeDate = effectiveDate ?? todayISO();
    const previousEffective = getEffectiveDailyDose(currentMed);
    const nextMed: Medication = {
      ...currentMed,
      dose_amount: update.dose_amount,
      dose_unit: update.dose_unit ?? currentMed.dose_unit,
      units_per_dose: update.units_per_dose ?? currentMed.units_per_dose ?? 1,
      frequency_details:
        update.frequency_details !== undefined
          ? update.frequency_details
          : currentMed.frequency_details,
    };
    const nextEffective = getEffectiveDailyDose(nextMed);
    const changeType = nextEffective > previousEffective ? 'dose_increased' : 'dose_decreased';

    const updatePayload: Partial<MedicationInsert> = {
      dose_amount: update.dose_amount,
      units_per_dose: update.units_per_dose ?? currentMed.units_per_dose ?? 1,
    };
    if (update.dose_unit) updatePayload.dose_unit = update.dose_unit;
    if (update.frequency_details !== undefined) {
      updatePayload.frequency_details = update.frequency_details ?? undefined;
    }

    const { error: updateError } = await supabase
      .from('medications')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return { ok: false, error: updateError.message };
    }

    const { error: changeError } = await supabase.from('medication_changes').insert({
      user_id: userId,
      medication_id: id,
      change_type: changeType,
      previous_dose: previousEffective,
      new_dose: nextEffective,
      change_date: changeDate,
      notes: notes ?? null,
    });

    if (changeError) {
      setError(changeError.message);
      return { ok: false, error: changeError.message };
    }

    await fetchMedications();
    return { ok: true };
  };

  const changeFrequency = async (
    id: string,
    newFrequency: MedicationFrequency,
    frequencyDetails?: Record<string, unknown>,
    effectiveDate?: string,
    notes?: string,
  ): Promise<MedicationMutationResult> => {
    const userId = getUserId();
    if (!userId) {
      const message = 'Not authenticated';
      setError(message);
      return { ok: false, error: message };
    }

    const changeDate = effectiveDate ?? todayISO();

    const { error: updateError } = await supabase
      .from('medications')
      .update({
        frequency: newFrequency,
        frequency_details: frequencyDetails ?? null,
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return { ok: false, error: updateError.message };
    }

    const { error: changeError } = await supabase.from('medication_changes').insert({
      user_id: userId,
      medication_id: id,
      change_type: 'frequency_changed',
      change_date: changeDate,
      notes: notes ?? null,
    });

    if (changeError) {
      setError(changeError.message);
      return { ok: false, error: changeError.message };
    }

    await fetchMedications();
    return { ok: true };
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

    const { error: updateError } = await supabase
      .from('medications')
      .update({ end_date: endDate, is_active: false })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return { ok: false, error: updateError.message };
    }

    const { error: changeError } = await supabase.from('medication_changes').insert({
      user_id: userId,
      medication_id: id,
      change_type: 'stopped',
      change_date: endDate,
      notes: reason ?? null,
    });

    if (changeError) {
      setError(changeError.message);
      return { ok: false, error: changeError.message };
    }

    await fetchMedications();
    return { ok: true };
  };

  const reactivateMedication = async (id: string): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    const today = todayISO();

    const { error: updateError } = await supabase
      .from('medications')
      .update({ end_date: null, is_active: true })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    const { error: changeError } = await supabase.from('medication_changes').insert({
      user_id: userId,
      medication_id: id,
      change_type: 'started',
      change_date: today,
      notes: 'Reactivated',
    });

    if (changeError) {
      setError(changeError.message);
      return false;
    }

    await fetchMedications();
    return true;
  };

  const deleteMedication = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase.from('medications').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
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
    discontinueMedication,
    reactivateMedication,
    deleteMedication,
  };
}
