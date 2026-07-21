import { useMedicationChangesStore } from '../stores/medicationChangesStore';

export type { MedicationChangeWithMed } from '../stores/medicationChangesStore';

/**
 * Shared across the meds page, dashboard cards, and insights — state lives in
 * `useMedicationChangesStore` so it's fetched once per session, not once per consumer.
 */
export function useMedicationChanges() {
  const changes = useMedicationChangesStore((s) => s.changes);
  const isLoading = useMedicationChangesStore((s) => s.isLoading);
  const error = useMedicationChangesStore((s) => s.error);
  const fetchChanges = useMedicationChangesStore((s) => s.fetchChanges);

  return {
    changes,
    isLoading,
    error,
    fetchChanges,
  };
}
