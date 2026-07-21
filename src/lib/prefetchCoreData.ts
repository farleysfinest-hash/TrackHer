import { useMedicationsStore } from '../stores/medicationsStore';
import { useMedicationChangesStore } from '../stores/medicationChangesStore';
import { useLabResultsStore } from '../stores/labResultsStore';
import { useCheckinsStore } from '../stores/checkinsStore';

/**
 * Warms the shared data stores once per authenticated session so every page/
 * widget that mounts afterward reads from cache instead of firing its own
 * fetch — this is what actually kills the tab-switch refetch lag.
 */
export async function prefetchCoreData(): Promise<void> {
  await Promise.all([
    useMedicationsStore.getState().fetchMedications(),
    useMedicationChangesStore.getState().fetchChanges(),
    useLabResultsStore.getState().fetchLabResults(),
    useCheckinsStore.getState().fetchCheckins(),
  ]);
}

/** Clear cached core data on sign-out so the next account cannot see stale rows. */
export function clearCoreDataCaches(): void {
  useMedicationsStore.getState().reset();
  useMedicationChangesStore.getState().reset();
  useLabResultsStore.getState().reset();
  useCheckinsStore.getState().reset();
}
