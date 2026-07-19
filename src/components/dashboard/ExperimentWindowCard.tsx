import { useEffect, useMemo, useState } from 'react';
import { useMedicationChanges, type MedicationChangeWithMed } from '../../hooks/useMedicationChanges';
import { useAuthStore } from '../../stores/authStore';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { addDaysISO, getMedicationChangePastLabel } from '../../utils/medicationHelpers';
import { formatDate, formatDateLong } from '../../utils/formatters';
import { Card } from '../ui/Card';
import type { Insight } from '../../engine/types';
import { daysBetweenISO } from '../../utils/localDate';

const WINDOW_DAYS = 21;
const SPARSE_GRACE_DAYS = 3;

function daysBetween(from: string, to: string): number {
  return daysBetweenISO(from, to);
}

function sparseDismissKey(changeId: string): string {
  return `experiment_sparse_${changeId}`;
}

function hasReadoutForChange(change: MedicationChangeWithMed, insights: Insight[]): boolean {
  const medId = change.medication_id;
  if (!medId) return false;

  return insights.some(
    (i) =>
      i.relatedMedication === medId &&
      (i.category === 'dose_correlation' ||
        i.category === 'wellbeing_signal' ||
        i.category === 'mixed_signals' ||
        i.id === `wb-dose-${change.id}`),
  );
}

interface ExperimentWindowCardProps {
  insights: Insight[];
  hasCheckedInToday: boolean;
}

export function ExperimentWindowCard({ insights, hasCheckedInToday }: ExperimentWindowCardProps) {
  const { changes, fetchChanges } = useMedicationChanges();
  const profile = useAuthStore((s) => s.profile);
  const timezone = getResolvedTimezone(profile?.timezone);
  const today = getLocalDateISO(timezone);

  const [sparseDismissed, setSparseDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetchChanges();
  }, [fetchChanges]);

  const activeChange = useMemo(() => {
    return (
      changes
        .filter((c) => {
          if (c.change_type === 'stopped') return false;
          if (!c.medication || c.medication.is_active === false) return false;
          const elapsed = daysBetween(c.change_date, today);
          return elapsed >= 0 && elapsed < WINDOW_DAYS + SPARSE_GRACE_DAYS;
        })
        .sort((a, b) => b.change_date.localeCompare(a.change_date))[0] ?? null
    );
  }, [changes, today]);

  const view = useMemo(() => {
    if (!activeChange?.medication) return null;

    const elapsed = daysBetween(activeChange.change_date, today);
    const dayN = elapsed + 1;
    const readoutDate = addDaysISO(activeChange.change_date, WINDOW_DAYS);
    const changeLabel = getMedicationChangePastLabel(activeChange, activeChange.medication);
    const changeDate = formatDate(activeChange.change_date);
    const hasReadout = hasReadoutForChange(activeChange, insights);

    if (elapsed >= WINDOW_DAYS) {
      if (hasReadout) return null;

      const sparseDay = elapsed - WINDOW_DAYS;
      if (sparseDay >= SPARSE_GRACE_DAYS) return null;

      const dismissed = hasUiFlag(profile, sparseDismissKey(activeChange.id));
      if (dismissed || sparseDismissed[activeChange.id]) return null;

      return {
        mode: 'sparse' as const,
        change: activeChange,
        changeLabel,
        changeDate,
        readoutDate,
      };
    }

    return {
      mode: 'active' as const,
      change: activeChange,
      changeLabel,
      changeDate,
      dayN,
      readoutDate,
      progress: Math.min((dayN / WINDOW_DAYS) * 100, 100),
    };
  }, [activeChange, today, insights, sparseDismissed, profile]);

  if (!view) return null;

  const dismissSparse = () => {
    setUiFlag(sparseDismissKey(view.change.id));
    setSparseDismissed((prev) => ({ ...prev, [view.change.id]: true }));
  };

  if (view.mode === 'sparse') {
    return (
      <Card variant="elevated">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Dose-change window</p>
        <h2 className="mt-1 font-display text-lg text-sage-800">Window complete</h2>
        <p className="mt-2 text-sm leading-relaxed text-sage-600">
          We didn&apos;t have enough daily logs to spot a clear pattern this time. That&apos;s okay — when
          your next dose changes, the window starts fresh.
        </p>
        <button
          type="button"
          onClick={dismissSparse}
          className="mt-3 text-sm text-sage-500 underline hover:text-sage-700"
        >
          Got it
        </button>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Dose-change window</p>
      <h2 className="mt-1 font-display text-lg text-sage-800">
        {view.changeLabel} on {view.changeDate} — day {view.dayN}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sage-600">
        When a medication changes, your body takes time to respond. We watch the 21 days after a
        change for patterns in your energy, mood, and sleep.{' '}
        {view.dayN <= 7
          ? 'Log your daily pulse as often as you can — even a few entries help.'
          : view.dayN <= 14
            ? 'Your early logs are building a picture. Keep going.'
            : 'Almost there. Every pulse you log sharpens your readout.'}
      </p>
      <p className="mt-1 text-sm text-sage-500">
        Your readout arrives {formatDateLong(view.readoutDate)}.
      </p>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand-100">
        <div
          className="h-full rounded-full bg-sage-500 transition-all duration-500"
          style={{ width: `${view.progress}%` }}
        />
      </div>

      {hasCheckedInToday && (
        <p className="mt-3 text-sm text-sage-500">Today&apos;s pulse: logged.</p>
      )}
    </Card>
  );
}
