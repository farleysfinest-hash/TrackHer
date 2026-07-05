import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { MOCK_USER } from '../lib/mockData';
import {
  getDevMedications,
  setDevMedications,
  getDevMedicationChanges,
  setDevMedicationChanges,
} from '../lib/devStore';
import { useAuthStore } from '../stores/authStore';
import type {
  Medication,
  MedicationInsert,
  MedicationFrequency,
  MedicationChange,
} from '../types/database';

async function fetchMedicationById(id: string): Promise<Medication | null> {
  const { data, error } = await supabase.from('medications').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as Medication;
}

function devMedicationById(id: string): Medication | null {
  return getDevMedications().find((m) => m.id === id) ?? null;
}

function appendDevChange(change: Omit<MedicationChange, 'id' | 'created_at'>): void {
  const changes = getDevMedicationChanges();
  setDevMedicationChanges([
    {
      ...change,
      id: `change-dev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    },
    ...changes,
  ]);
}

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>(
    IS_DEV_MODE ? [...getDevMedications()] : [],
  );
  const [isLoading, setIsLoading] = useState(!IS_DEV_MODE);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const syncDevMedications = useCallback(() => {
    setMedications([...getDevMedications()]);
    setIsLoading(false);
  }, []);

  const fetchMedications = useCallback(async () => {
    if (IS_DEV_MODE) {
      syncDevMedications();
      return;
    }

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
  }, [syncDevMedications]);

  const fetchActiveMedications = useCallback(async () => {
    if (IS_DEV_MODE) {
      setMedications(getDevMedications().filter((m) => m.is_active));
      setIsLoading(false);
      return;
    }

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

  const addMedication = async (data: MedicationInsert): Promise<Medication | null> => {
    const userId = getUserId();
    if (!userId) {
      setError('Not authenticated');
      return null;
    }

    if (IS_DEV_MODE) {
      const newMed: Medication = {
        ...data,
        id: `med-dev-${Date.now()}`,
        user_id: MOCK_USER.id,
        secondary_dose_amount: data.secondary_dose_amount ?? null,
        secondary_dose_unit: data.secondary_dose_unit ?? null,
        tertiary_dose_amount: data.tertiary_dose_amount ?? null,
        tertiary_dose_unit: data.tertiary_dose_unit ?? null,
        frequency_details: data.frequency_details ?? null,
        application_site: data.application_site ?? null,
        end_date: data.end_date ?? null,
        is_active: data.is_active ?? true,
        prescriber_name: data.prescriber_name ?? null,
        pharmacy_name: data.pharmacy_name ?? null,
        notes: data.notes ?? null,
        pellet_insertion_date: data.pellet_insertion_date ?? null,
        pellet_expected_duration_months: data.pellet_expected_duration_months ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDevMedications([...getDevMedications(), newMed]);
      appendDevChange({
        user_id: MOCK_USER.id,
        medication_id: newMed.id,
        change_type: 'started',
        previous_dose: null,
        new_dose: newMed.dose_amount,
        previous_method: null,
        new_method: null,
        change_date: newMed.start_date,
        notes: null,
      });
      syncDevMedications();
      console.log('[DEV] Medication added:', newMed);
      return newMed;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('medications')
      .insert({ ...data, user_id: userId, is_active: data.is_active ?? true })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return null;
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
      setError(changeError.message);
      return null;
    }

    await fetchMedications();
    return medication;
  };

  const updateMedication = async (
    id: string,
    updates: Partial<MedicationInsert>,
  ): Promise<boolean> => {
    if (IS_DEV_MODE) {
      setDevMedications(
        getDevMedications().map((m) =>
          m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m,
        ),
      );
      syncDevMedications();
      console.log('[DEV] Medication updated:', id, updates);
      return true;
    }

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
    newDose: number,
    newUnit?: string,
    effectiveDate?: string,
    notes?: string,
  ): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    if (IS_DEV_MODE) {
      const currentMed = devMedicationById(id);
      if (!currentMed) {
        setError('Medication not found');
        return false;
      }

      const changeDate = effectiveDate ?? new Date().toISOString().split('T')[0];
      const changeType = newDose > currentMed.dose_amount ? 'dose_increased' : 'dose_decreased';

      setDevMedications(
        getDevMedications().map((m) =>
          m.id === id
            ? {
                ...m,
                dose_amount: newDose,
                dose_unit: newUnit || m.dose_unit,
                updated_at: new Date().toISOString(),
              }
            : m,
        ),
      );
      appendDevChange({
        user_id: MOCK_USER.id,
        medication_id: id,
        change_type: changeType,
        previous_dose: currentMed.dose_amount,
        new_dose: newDose,
        previous_method: null,
        new_method: null,
        change_date: changeDate,
        notes: notes ?? null,
      });
      syncDevMedications();
      console.log(`[DEV] Dose changed for ${id}: ${newDose}`);
      return true;
    }

    const currentMed = await fetchMedicationById(id);
    if (!currentMed) {
      setError('Medication not found');
      return false;
    }

    const changeDate = effectiveDate ?? new Date().toISOString().split('T')[0];
    const changeType = newDose > currentMed.dose_amount ? 'dose_increased' : 'dose_decreased';

    const updatePayload: Partial<MedicationInsert> = { dose_amount: newDose };
    if (newUnit) updatePayload.dose_unit = newUnit;

    const { error: updateError } = await supabase
      .from('medications')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    const { error: changeError } = await supabase.from('medication_changes').insert({
      user_id: userId,
      medication_id: id,
      change_type: changeType,
      previous_dose: currentMed.dose_amount,
      new_dose: newDose,
      change_date: changeDate,
      notes: notes ?? null,
    });

    if (changeError) {
      setError(changeError.message);
      return false;
    }

    await fetchMedications();
    return true;
  };

  const changeFrequency = async (
    id: string,
    newFrequency: MedicationFrequency,
    frequencyDetails?: Record<string, unknown>,
    effectiveDate?: string,
    notes?: string,
  ): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    if (IS_DEV_MODE) {
      const changeDate = effectiveDate ?? new Date().toISOString().split('T')[0];
      setDevMedications(
        getDevMedications().map((m) =>
          m.id === id
            ? {
                ...m,
                frequency: newFrequency,
                frequency_details: frequencyDetails ?? null,
                updated_at: new Date().toISOString(),
              }
            : m,
        ),
      );
      appendDevChange({
        user_id: MOCK_USER.id,
        medication_id: id,
        change_type: 'frequency_changed',
        previous_dose: null,
        new_dose: null,
        previous_method: null,
        new_method: null,
        change_date: changeDate,
        notes: notes ?? null,
      });
      syncDevMedications();
      console.log(`[DEV] Frequency changed for ${id}: ${newFrequency}`);
      return true;
    }

    const changeDate = effectiveDate ?? new Date().toISOString().split('T')[0];

    const { error: updateError } = await supabase
      .from('medications')
      .update({
        frequency: newFrequency,
        frequency_details: frequencyDetails ?? null,
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
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
      return false;
    }

    await fetchMedications();
    return true;
  };

  const discontinueMedication = async (
    id: string,
    endDate: string,
    reason?: string,
  ): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    if (IS_DEV_MODE) {
      setDevMedications(
        getDevMedications().map((m) =>
          m.id === id
            ? { ...m, is_active: false, end_date: endDate, updated_at: new Date().toISOString() }
            : m,
        ),
      );
      appendDevChange({
        user_id: MOCK_USER.id,
        medication_id: id,
        change_type: 'stopped',
        previous_dose: null,
        new_dose: null,
        previous_method: null,
        new_method: null,
        change_date: endDate,
        notes: reason ?? null,
      });
      syncDevMedications();
      console.log(`[DEV] Medication discontinued: ${id}, reason: ${reason}`);
      return true;
    }

    const { error: updateError } = await supabase
      .from('medications')
      .update({ end_date: endDate, is_active: false })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
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
      return false;
    }

    await fetchMedications();
    return true;
  };

  const reactivateMedication = async (id: string): Promise<boolean> => {
    const userId = getUserId();
    if (!userId) return false;

    if (IS_DEV_MODE) {
      const today = new Date().toISOString().split('T')[0];
      setDevMedications(
        getDevMedications().map((m) =>
          m.id === id
            ? { ...m, end_date: null, is_active: true, updated_at: new Date().toISOString() }
            : m,
        ),
      );
      appendDevChange({
        user_id: MOCK_USER.id,
        medication_id: id,
        change_type: 'started',
        previous_dose: null,
        new_dose: null,
        previous_method: null,
        new_method: null,
        change_date: today,
        notes: 'Reactivated',
      });
      syncDevMedications();
      console.log(`[DEV] Medication reactivated: ${id}`);
      return true;
    }

    const today = new Date().toISOString().split('T')[0];

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
    if (IS_DEV_MODE) {
      setDevMedications(getDevMedications().filter((m) => m.id !== id));
      syncDevMedications();
      console.log(`[DEV] Medication deleted: ${id}`);
      return true;
    }

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
