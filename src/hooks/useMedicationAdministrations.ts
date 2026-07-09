import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { MOCK_USER } from '../lib/mockData';
import {
  getDevMedicationAdministrations,
  setDevMedicationAdministrations,
} from '../lib/devStore';
import { useAuthStore } from '../stores/authStore';
import type { MedicationAdministration } from '../types/database';

export function useMedicationAdministrations() {
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>(
    IS_DEV_MODE ? [...getDevMedicationAdministrations()] : [],
  );
  const [isLoading, setIsLoading] = useState(!IS_DEV_MODE);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchRecent = useCallback(async (days = 90) => {
    if (IS_DEV_MODE) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffISO = cutoff.toISOString();
      const filtered = getDevMedicationAdministrations()
        .filter((a) => a.taken_at >= cutoffISO)
        .sort((a, b) => b.taken_at.localeCompare(a.taken_at));
      setAdministrations(filtered);
      setIsLoading(false);
      return;
    }

    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffISO = cutoff.toISOString();

    const { data, error: fetchError } = await supabase
      .from('medication_administrations')
      .select('*')
      .eq('user_id', userId)
      .gte('taken_at', cutoffISO)
      .order('taken_at', { ascending: false });

    setIsLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setAdministrations((data as MedicationAdministration[]) ?? []);
  }, []);

  useEffect(() => {
    void fetchRecent(90);
  }, [fetchRecent]);

  const logAdministration = useCallback(
    async (medicationId: string, takenAt?: string): Promise<MedicationAdministration | null> => {
      const userId = getUserId();
      if (!userId) return null;

      const takenAtISO = takenAt ?? new Date().toISOString();

      if (IS_DEV_MODE) {
        const admin: MedicationAdministration = {
          id: `admin-dev-${Date.now()}`,
          user_id: MOCK_USER.id,
          medication_id: medicationId,
          taken_at: takenAtISO,
          created_at: new Date().toISOString(),
        };
        setDevMedicationAdministrations([admin, ...getDevMedicationAdministrations()]);
        setAdministrations((prev) => [admin, ...prev]);
        return admin;
      }

      const { data, error: insertError } = await supabase
        .from('medication_administrations')
        .insert({ medication_id: medicationId, taken_at: takenAtISO, user_id: userId })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const created = data as MedicationAdministration;
      setAdministrations((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const undoLast = useCallback(async (medicationId: string): Promise<boolean> => {
    const latest = administrations
      .filter((a) => a.medication_id === medicationId)
      .sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];

    if (!latest) return false;

    if (IS_DEV_MODE) {
      setDevMedicationAdministrations(
        getDevMedicationAdministrations().filter((a) => a.id !== latest.id),
      );
      setAdministrations((prev) => prev.filter((a) => a.id !== latest.id));
      return true;
    }

    const { error: deleteError } = await supabase
      .from('medication_administrations')
      .delete()
      .eq('id', latest.id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setAdministrations((prev) => prev.filter((a) => a.id !== latest.id));
    return true;
  }, [administrations]);

  return {
    administrations,
    isLoading,
    error,
    fetchRecent,
    logAdministration,
    undoLast,
  };
}
