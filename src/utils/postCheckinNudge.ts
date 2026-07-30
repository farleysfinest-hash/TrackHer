import { addDaysISO, daysBetweenISO } from './localDate';
import { EXPERIMENT_WINDOW_DAYS } from './medicationHelpers';

export type PostCheckinNudgeId = 'dose_followup' | 'stale_labs' | 'stale_meds';

export interface PostCheckinNudgeInput {
  today: string;
  changes: Array<{ change_date: string }>;
  labs: Array<{ draw_date: string }>;
  medications: Array<{
    is_active: boolean;
    start_date: string;
    end_date: string | null;
    created_at?: string;
    updated_at?: string;
  }>;
}

export function resolvePostCheckinNudge({
  today,
  changes,
  labs,
  medications,
}: PostCheckinNudgeInput): PostCheckinNudgeId | null {
  const mostRecentChange = [...changes].sort((a, b) =>
    b.change_date.localeCompare(a.change_date),
  )[0];

  if (mostRecentChange) {
    const windowEnd = addDaysISO(mostRecentChange.change_date, EXPERIMENT_WINDOW_DAYS);
    const daysSinceWindowEnd = daysBetweenISO(windowEnd, today);
    if (daysSinceWindowEnd >= 0 && daysSinceWindowEnd <= 7) {
      return 'dose_followup';
    }
  }

  const hasMedications = medications.length > 0;
  if (hasMedications && labs.length === 0) {
    return 'stale_labs';
  }

  if (labs.length > 0) {
    const newestDraw = labs
      .map((lab) => lab.draw_date)
      .sort((a, b) => b.localeCompare(a))[0];
    if (newestDraw && daysBetweenISO(newestDraw, today) >= 60) {
      return 'stale_labs';
    }
  }

  const activeMeds = medications.filter((m) => m.is_active);
  if (activeMeds.length > 0) {
    const activityDates: string[] = [];
    for (const change of changes) {
      activityDates.push(change.change_date);
    }
    for (const med of medications) {
      activityDates.push(med.start_date);
      if (med.end_date) activityDates.push(med.end_date);
      if (med.created_at) activityDates.push(med.created_at.slice(0, 10));
      if (med.updated_at) activityDates.push(med.updated_at.slice(0, 10));
    }
    const mostRecentActivity = activityDates.sort((a, b) => b.localeCompare(a))[0];
    if (mostRecentActivity && daysBetweenISO(mostRecentActivity, today) >= 120) {
      return 'stale_meds';
    }
  }

  return null;
}
