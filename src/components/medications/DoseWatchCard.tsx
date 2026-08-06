import { useEffect, useMemo, useState } from 'react';
import { Moon, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { useMedicationChanges } from '../../hooks/useMedicationChanges';
import { useAuthStore } from '../../stores/authStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { EXPERIMENT_WINDOW_DAYS } from '../../utils/medicationHelpers';
import { daysBetweenISO } from '../../utils/localDate';
import { readAiInsightCache } from '../../utils/aiInsightsCache';
import {
  clampDoseWatchPack,
  doseWatchCacheKey,
  type DoseWatchPack,
} from '../../utils/aiDoseWatch';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';
import { AskLunaButton } from '../luna/AskLunaButton';

function dismissKey(changeId: string): string {
  return `dose_watch_dismiss_${changeId}`;
}

/**
 * Soft companion note while an experiment window is active.
 * Hidden when there is no recent dose change or she dismissed this change.
 */
export function DoseWatchCard() {
  const { changes, fetchChanges } = useMedicationChanges();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);
  const timezone = getResolvedTimezone(profile?.timezone);
  const today = getLocalDateISO(timezone);
  const [pack, setPack] = useState<DoseWatchPack | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void fetchChanges();
  }, [fetchChanges]);

  const activeChange = useMemo(() => {
    return (
      changes
        .filter((c) => {
          if (c.change_type === 'stopped') return false;
          if (!c.medication || c.medication.is_active === false) return false;
          const elapsed = daysBetweenISO(c.change_date, today);
          return elapsed >= 0 && elapsed < EXPERIMENT_WINDOW_DAYS;
        })
        .sort((a, b) => b.change_date.localeCompare(a.change_date))[0] ?? null
    );
  }, [changes, today]);

  useEffect(() => {
    if (!userId || !activeChange?.medication) {
      setPack(null);
      return;
    }
    if (hasUiFlag(profile, dismissKey(activeChange.id))) {
      setDismissed(true);
      setPack(null);
      return;
    }
    setDismissed(false);
    let cancelled = false;
    const hash = doseWatchCacheKey(
      activeChange.change_date,
      activeChange.medication.medication_name,
    );
    void readAiInsightCache<DoseWatchPack>(userId, 'dose_watch', hash).then((cached) => {
      if (cancelled) return;
      setPack(clampDoseWatchPack(cached));
    });
    return () => {
      cancelled = true;
    };
  }, [userId, activeChange, profile]);

  if (!activeChange?.medication || dismissed || !pack) return null;

  const onDismiss = () => {
    setUiFlag(dismissKey(activeChange.id));
    setDismissed(true);
    setPack(null);
  };

  return (
    <Card variant="outlined" padding="md" className="border-sage-200">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-sand-100 p-2 text-sage-600">
          <Moon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
              Luna after your dose change
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="flex h-11 w-11 items-center justify-center rounded text-sage-400 hover:bg-sage-50 hover:text-sage-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-sage-700">{pack.note}</p>
          {pack.watchFor.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-sage-600">
              {pack.watchFor.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <AskLunaButton
            label="Ask Luna about this change"
            className="mt-3 px-0"
            request={{
              kind: 'medication',
              title: `Change to ${activeChange.medication.medication_name}`,
              context: {
                sourceType: 'medication_change',
                sourceId: activeChange.id,
                label: `${activeChange.medication.medication_name} change on ${activeChange.change_date}`,
                medicationName: activeChange.medication.medication_name,
                changeDate: activeChange.change_date,
                changeType: activeChange.change_type,
                previousDose: activeChange.previous_dose,
                newDose: activeChange.new_dose,
              },
              seedMessage: `What has changed in my symptoms around the ${activeChange.medication.medication_name} change on ${activeChange.change_date}?`,
            }}
          />
        </div>
      </div>
    </Card>
  );
}
