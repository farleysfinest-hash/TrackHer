import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { MedicationAdministration } from '../types/database';
import { getActiveTimezone, getEventLocalMetadata } from '../utils/localDate';
import { DOSE_HISTORY_DAYS } from '../utils/doseSchedule';
import { fetchAllPages } from '../utils/pagedQuery';

export function useMedicationAdministrations() {
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchRecent = useCallback(async (days = DOSE_HISTORY_DAYS, opts?: { silent?: boolean }) => {
    const userId = getUserId();
    if (!userId) return;

    if (!opts?.silent) {
      setIsLoading(true);
      setError(null);
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffISO = cutoff.toISOString();

    try {
      const rows = await fetchAllPages<MedicationAdministration>(async (from, to) => {
        const { data, error: fetchError } = await supabase
          .from('medication_administrations')
          .select('*')
          .eq('user_id', userId)
          .gte('taken_at', cutoffISO)
          .order('taken_at', { ascending: false })
          .range(from, to);
        return { data: data as MedicationAdministration[] | null, error: fetchError };
      });
      if (getUserId() !== userId) return;
      setAdministrations(rows);
    } catch (e) {
      if (getUserId() !== userId) return;
      if (!opts?.silent) {
        setError(e instanceof Error ? e.message : 'Failed to load doses');
      }
    } finally {
      if (getUserId() === userId && !opts?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecent(DOSE_HISTORY_DAYS);
  }, [fetchRecent]);

  useEffect(() => {
    const onChange = () => {
      void fetchRecent(DOSE_HISTORY_DAYS, { silent: true });
    };
    window.addEventListener('trackher:doses-changed', onChange);
    window.addEventListener('trackher:medications-changed', onChange);
    window.addEventListener('trackher:account-reset', onChange);
    return () => {
      window.removeEventListener('trackher:doses-changed', onChange);
      window.removeEventListener('trackher:medications-changed', onChange);
      window.removeEventListener('trackher:account-reset', onChange);
    };
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
      window.dispatchEvent(new CustomEvent('trackher:doses-changed'));
      return created;
    },
    [],
  );

  const undoLast = useCallback(async (medicationId: string): Promise<boolean> => {
    const latest = administrations
      .filter((a) => a.medication_id === medicationId)
      .sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];

    if (!latest) return false;

    const userId = useAuthStore.getState().user?.id;
    if (!userId) return false;

    const { error: deleteError } = await supabase
      .from('medication_administrations')
      .delete()
      .eq('id', latest.id)
      .eq('user_id', userId);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setAdministrations((prev) => prev.filter((a) => a.id !== latest.id));
    window.dispatchEvent(new CustomEvent('trackher:doses-changed'));
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
