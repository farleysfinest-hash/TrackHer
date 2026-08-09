import { useMemo } from 'react';
import { useCheckinStatus } from './useCheckinStatus';
import { useMedications } from './useMedications';
import { useMedicationAdministrations } from './useMedicationAdministrations';
import { useLocalToday } from './useLocalToday';
import { useAuthStore } from '../stores/authStore';
import { useLuna } from '../components/luna/LunaProvider';
import { getResolvedTimezone } from '../utils/checkinHelpers';
import {
  countDosesOutstandingToday,
  getOutstandingFirstDoseStatuses,
} from '../utils/doseSchedule';
import type { CheckinProgressItem } from '../components/checkin/CheckinProgressBar';

/**
 * Aggregates completion state for the four check-in page items:
 * Luna, doses, weekly check-in, daily pulse.
 *
 * Data comes from stores that are already populated by the widgets on the page,
 * so this hook does not trigger additional network requests.
 */
export function useCheckinProgress(): CheckinProgressItem[] {
  const { lunaActiveToday } = useLuna();
  const { hasCheckedInToday, weeklyMinimumMet, hasFullMrsToday } = useCheckinStatus();
  const { medications } = useMedications();
  const { administrations } = useMedicationAdministrations();
  const profile = useAuthStore((s) => s.profile);
  const timezone = getResolvedTimezone(profile?.timezone);
  const today = useLocalToday(timezone);

  const dosesComplete = useMemo(() => {
    const statuses = getOutstandingFirstDoseStatuses(medications, administrations, today, timezone);
    if (statuses.length === 0) return true;
    return countDosesOutstandingToday(statuses) === 0;
  }, [medications, administrations, today, timezone]);

  return useMemo(
    () => [
      { label: 'Luna', done: lunaActiveToday },
      { label: 'Doses', done: dosesComplete },
      { label: 'Weekly', done: weeklyMinimumMet || hasFullMrsToday },
      { label: 'Pulse', done: hasCheckedInToday },
    ],
    [lunaActiveToday, dosesComplete, weeklyMinimumMet, hasFullMrsToday, hasCheckedInToday],
  );
}
