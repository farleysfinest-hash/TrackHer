import { useEffect } from 'react';
import { useAdministrationsStore } from '../stores/administrationsStore';
import { DOSE_HISTORY_DAYS } from '../utils/doseSchedule';

/**
 * Shared administrations cache — MobileNav, Sidebar, DoseTap, and Insights
 * all read the same store so tab switches do not re-hit Supabase.
 */
export function useMedicationAdministrations() {
  const administrations = useAdministrationsStore((s) => s.administrations);
  const isLoading = useAdministrationsStore((s) => s.isLoading);
  const error = useAdministrationsStore((s) => s.error);
  const fetchRecent = useAdministrationsStore((s) => s.fetchRecent);
  const logAdministration = useAdministrationsStore((s) => s.logAdministration);
  const undoLast = useAdministrationsStore((s) => s.undoLast);

  useEffect(() => {
    void fetchRecent(DOSE_HISTORY_DAYS);
  }, [fetchRecent]);

  return {
    administrations,
    isLoading,
    error,
    fetchRecent,
    logAdministration,
    undoLast,
  };
}
