import { useMemo } from 'react';
import { useCheckinStatus } from './useCheckinStatus';
import { useMedications } from './useMedications';
import { useMedicationAdministrations } from './useMedicationAdministrations';
import { useLocalToday } from './useLocalToday';
import { useAuthStore } from '../stores/authStore';
import { getResolvedTimezone } from '../utils/checkinHelpers';
import {
  countDosesOutstandingToday,
  getOutstandingFirstDoseStatuses,
} from '../utils/doseSchedule';
import type { CheckinProgressItem } from '../components/checkin/CheckinProgressBar';

/**
 * Aggregates completion state for the three core check-in tasks:
 * doses, weekly check-in, daily pulse.
 *
 * Luna is intentionally excluded — it's an alternative conversational
 * interface for checking in, not a separate task.
 *
 * Data comes from stores that are already populated by the widgets on the page,
 * so this hook does not trigger additional network requests.
 */
export function useCheckinProgress(): CheckinProgressItem[] {
  const { hasCheckedInToday, weeklyMinimumMet, hasFullMrsToday, isDue } = useCheckinStatus();
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

  const weeklyRelevant = isDue || hasFullMrsToday;

  return useMemo(() => {
    const items: CheckinProgressItem[] = [
      { label: 'Doses', done: dosesComplete },
      { label: 'Pulse', done: hasCheckedInToday },
    ];
    if (weeklyRelevant) {
      items.splice(1, 0, { label: 'Weekly', done: weeklyMinimumMet || hasFullMrsToday });
    }
    return items;
  }, [dosesComplete, weeklyRelevant, weeklyMinimumMet, hasFullMrsToday, hasCheckedInToday]);
}
