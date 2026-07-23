import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useMedicationChanges } from '../../hooks/useMedicationChanges';
import { useLabResults } from '../../hooks/useLabResults';
import { useMedications } from '../../hooks/useMedications';
import { useAuthStore } from '../../stores/authStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { addDaysISO, daysBetweenISO } from '../../utils/localDate';
import { EXPERIMENT_WINDOW_DAYS } from '../../utils/medicationHelpers';
import { Card } from '../ui/Card';

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

const NUDGE_COPY: Record<
  PostCheckinNudgeId,
  { text: string; path: '/medications' | '/labs' }
> = {
  dose_followup: {
    text: 'How did the dose change go? Review your medications',
    path: '/medications',
  },
  stale_labs: {
    text: "It's been a while since your last labs. Add recent results",
    path: '/labs',
  },
  stale_meds: {
    text: 'Is your medication list still current? Review it',
    path: '/medications',
  },
};

/** Pure priority resolver — first match wins. */
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

export function PostCheckinNudge() {
  const navigate = useNavigate();
  const { changes, fetchChanges } = useMedicationChanges();
  const { labResults, fetchLabResults } = useLabResults();
  const { medications, fetchMedications } = useMedications();
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const today = getLocalDateISO(timezone);

  useEffect(() => {
    void fetchChanges();
    void fetchLabResults();
    void fetchMedications();
  }, [fetchChanges, fetchLabResults, fetchMedications]);

  const nudgeId = resolvePostCheckinNudge({
    today,
    changes,
    labs: labResults,
    medications,
  });

  if (!nudgeId) return null;

  const nudge = NUDGE_COPY[nudgeId];

  return (
    <Card
      variant="outlined"
      padding="sm"
      className="cursor-pointer transition-colors hover:border-sage-300 hover:bg-sage-50/40"
      onClick={() => navigate(nudge.path)}
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-sage-700">{nudge.text}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-sage-400" aria-hidden />
      </div>
    </Card>
  );
}
