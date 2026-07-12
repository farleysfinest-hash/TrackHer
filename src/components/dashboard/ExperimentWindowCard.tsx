import { useEffect, useMemo, useState } from 'react';
import { useMedicationChanges, type MedicationChangeWithMed } from '../../hooks/useMedicationChanges';
import { useAuthStore } from '../../stores/authStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { addDaysISO, getMedicationChangeLabel } from '../../utils/medicationHelpers';
import { formatDateLong } from '../../utils/formatters';
import { Card } from '../ui/Card';
import type { Insight } from '../../engine/types';

const WINDOW_DAYS = 21;
const SPARSE_GRACE_DAYS = 3;

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function sparseDismissKey(changeId: string): string {
  return `trackher_experiment_sparse_${changeId}`;
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
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
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
    const changeLabel = getMedicationChangeLabel(activeChange, activeChange.medication);
    const hasReadout = hasReadoutForChange(activeChange, insights);

    if (elapsed >= WINDOW_DAYS) {
      if (hasReadout) return null;

      const sparseDay = elapsed - WINDOW_DAYS;
      if (sparseDay >= SPARSE_GRACE_DAYS) return null;

      const dismissed = localStorage.getItem(sparseDismissKey(activeChange.id)) === 'true';
      if (dismissed || sparseDismissed[activeChange.id]) return null;

      return {
        mode: 'sparse' as const,
        change: activeChange,
        changeLabel,
        readoutDate,
      };
    }

    return {
      mode: 'active' as const,
      change: activeChange,
      changeLabel,
      dayN,
      readoutDate,
      progress: Math.min((dayN / WINDOW_DAYS) * 100, 100),
    };
  }, [activeChange, today, insights, sparseDismissed]);

  if (!view) return null;

  const dismissSparse = () => {
    localStorage.setItem(sparseDismissKey(view.change.id), 'true');
    setSparseDismissed((prev) => ({ ...prev, [view.change.id]: true }));
  };

  if (view.mode === 'sparse') {
    return (
      <Card variant="elevated">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Dose-change window</p>
        <h2 className="mt-1 font-display text-lg text-sage-800">Window complete</h2>
        <p className="mt-2 text-sm leading-relaxed text-sage-600">
          There wasn&apos;t quite enough daily data for a clear readout this time — the next change
          will have a head start.
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
        Day {view.dayN} of {WINDOW_DAYS} — {view.changeLabel}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sage-600">
        Daily pulses during this window sharpen what we can tell you about this change. Your readout
        arrives {formatDateLong(view.readoutDate)}.
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
