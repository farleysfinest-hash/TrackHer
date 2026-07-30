import { useEffect, useMemo } from 'react';
import { useMedications } from './useMedications';
import { useMedicationAdministrations } from './useMedicationAdministrations';
import { useLocalToday } from './useLocalToday';
import { useAuthStore } from '../stores/authStore';
import { getResolvedTimezone } from '../utils/checkinHelpers';
import {
  countDosesOutstandingToday,
  getOutstandingFirstDoseStatuses,
} from '../utils/doseSchedule';

/**
 * Whether any scheduled dose is still owed today — drives Check-In Due chrome
 * (Check-In owns daily dose taps).
 */
export function useDosesDue() {
  const { medications, fetchActiveMedications, isLoading: medsLoading } = useMedications();
  const { administrations, isLoading: adminsLoading } = useMedicationAdministrations();
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const today = useLocalToday(timezone);

  useEffect(() => {
    void fetchActiveMedications();
  }, [fetchActiveMedications]);

  const outstanding = useMemo(() => {
    const statuses = getOutstandingFirstDoseStatuses(
      medications,
      administrations,
      today,
      timezone,
    );
    return countDosesOutstandingToday(statuses);
  }, [medications, administrations, today, timezone]);

  const isLoading = medsLoading || adminsLoading;
  const needsDoses = !isLoading && outstanding > 0;

  return { outstanding, needsDoses, isLoading };
}
