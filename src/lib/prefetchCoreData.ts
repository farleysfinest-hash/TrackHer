import { useMedicationsStore } from '../stores/medicationsStore';
import { useMedicationChangesStore } from '../stores/medicationChangesStore';
import { useLabResultsStore } from '../stores/labResultsStore';
import { useCheckinsStore } from '../stores/checkinsStore';
import { useAdministrationsStore } from '../stores/administrationsStore';
import { useSymptomSelectionsStore } from '../stores/symptomSelectionsStore';
import { DOSE_HISTORY_DAYS } from '../utils/doseSchedule';

/** Match Insights mixed check-in depth so first Insights visit does not expand cold. */
const PREFETCH_CHECKINS_LIMIT = 400;

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
    useCheckinsStore.getState().fetchCheckins(PREFETCH_CHECKINS_LIMIT),
    useAdministrationsStore.getState().fetchRecent(DOSE_HISTORY_DAYS),
    useSymptomSelectionsStore.getState().fetchSelections(),
  ]);
}

/** Clear cached core data on sign-out so the next account cannot see stale rows. */
export function clearCoreDataCaches(): void {
  useMedicationsStore.getState().reset();
  useMedicationChangesStore.getState().reset();
  useLabResultsStore.getState().reset();
  useCheckinsStore.getState().reset();
  useAdministrationsStore.getState().reset();
  useSymptomSelectionsStore.getState().reset();
}
