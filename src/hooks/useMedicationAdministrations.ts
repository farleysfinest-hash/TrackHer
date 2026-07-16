import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { MedicationAdministration } from '../types/database';
import { getActiveTimezone, getEventLocalMetadata } from '../utils/localDate';

export function useMedicationAdministrations() {
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchRecent = useCallback(async (days = 90) => {
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
      const preferredTimezone = useAuthStore.getState().profile?.timezone;
      const metadata = getEventLocalMetadata(takenAtISO, getActiveTimezone(preferredTimezone));

      const { data, error: insertError } = await supabase
        .from('medication_administrations')
        .insert({
          medication_id: medicationId,
          taken_at: takenAtISO,
          event_timezone: metadata.timezone,
          local_date: metadata.localDate,
          utc_offset_minutes: metadata.utcOffsetMinutes,
          user_id: userId,
        })
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
