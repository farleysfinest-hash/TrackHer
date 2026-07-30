import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useMedicationChanges } from '../../hooks/useMedicationChanges';
import { useLabResults } from '../../hooks/useLabResults';
import { useMedications } from '../../hooks/useMedications';
import { useAuthStore } from '../../stores/authStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import {
  resolvePostCheckinNudge,
  type PostCheckinNudgeId,
} from '../../utils/postCheckinNudge';
import { Card } from '../ui/Card';

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
