import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import {
  getDevMedications,
  getDevMedicationChanges,
} from '../lib/devStore';
import { useAuthStore } from '../stores/authStore';
import type { MedicationChange, Medication } from '../types/database';

export interface MedicationChangeWithMed extends MedicationChange {
  medication?: Medication | null;
}

export function useMedicationChanges() {
  const [changes, setChanges] = useState<MedicationChangeWithMed[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchChanges = useCallback(async (medicationId?: string) => {
    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    if (IS_DEV_MODE) {
      let devChanges = getDevMedicationChanges();
      if (medicationId) {
        devChanges = devChanges.filter((c) => c.medication_id === medicationId);
      }
      const medMap = new Map(getDevMedications().map((m) => [m.id, m]));
      const enriched = devChanges.map((change) => ({
        ...change,
        medication: change.medication_id ? medMap.get(change.medication_id) ?? null : null,
      }));
      setChanges(enriched);
      setIsLoading(false);
      return;
    }

    let query = supabase
      .from('medication_changes')
      .select('*')
      .eq('user_id', userId)
      .order('change_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (medicationId) {
      query = query.eq('medication_id', medicationId);
    }

    const { data: changesData, error: fetchError } = await query;

    if (fetchError) {
      setIsLoading(false);
      setError(fetchError.message);
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

    setChanges(enriched);
    setIsLoading(false);
  }, []);

  return {
    changes,
    isLoading,
    error,
    fetchChanges,
  };
}
