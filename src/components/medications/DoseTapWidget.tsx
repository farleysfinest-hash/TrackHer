import { useEffect, useMemo, useState } from 'react';
import { Pill } from 'lucide-react';
import { useMedications } from '../../hooks/useMedications';
import { useMedicationAdministrations } from '../../hooks/useMedicationAdministrations';
import { useLocalToday } from '../../hooks/useLocalToday';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';
import { getResolvedTimezone } from '../../utils/checkinHelpers';
import {
  countDosesOutstandingToday,
  getOutstandingFirstDoseStatuses,
  type DoseStatus,
} from '../../utils/doseSchedule';
import { tapLight } from '../../lib/haptics';
import type { Medication } from '../../types/database';
import { Card } from '../ui/Card';
import { DashboardCardHeader } from '../dashboard/DashboardCardHeader';

interface DoseTapWidgetProps {
  /** Overrides the default card title, so the check-in surface can ask its own question. */
  title?: string;
  /** Hides the card entirely when nothing is expected today. Used on the check-in surface. */
  hideWhenNothingDue?: boolean;
}

function formatLogTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

/**
 * Outstanding doses read as actionable; anything satisfied or off-schedule reads as quiet.
 *
 * The width cap lets long names ellipsize via CSS rather than a fixed character count, so a
 * wide viewport shows the whole name and two similarly-named patches stay distinguishable.
 */
function chipClassName(status: DoseStatus): string {
  const base =
    'flex w-full max-w-[17rem] flex-col items-start gap-0.5 rounded-2xl border px-3 py-2 text-left transition-colors active:scale-[0.98] sm:w-auto';

  switch (status.state) {
    case 'due_today':
    case 'partial_today':
      return `${base} border-sage-400 bg-sage-100 text-sage-800 hover:border-sage-500 hover:bg-sage-200`;
    case 'complete_today':
    case 'covered':
      return `${base} border-success/40 bg-success/10 text-success`;
    default:
      return `${base} border-sand-200 bg-sand-50 text-sage-500 hover:border-sage-300`;
  }
}

function summaryCopy(outstanding: number, total: number): string {
  if (total === 0) return 'No dose schedules to track yet.';
  if (outstanding === 0) return 'Everything expected today is logged.';
  if (outstanding === 1) return '1 medication still to log today.';
  return `${outstanding} medications still to log today.`;
}

export function DoseTapWidget({ title, hideWhenNothingDue = false }: DoseTapWidgetProps) {
  const toast = useToast();
  const { medications, fetchActiveMedications, isLoading: medsLoading } = useMedications();
  const {
    administrations,
    logAdministration,
    undoLast,
    isLoading: adminsLoading,
  } = useMedicationAdministrations();
  const profile = useAuthStore((s) => s.profile);
  const timezone = getResolvedTimezone(profile?.timezone);
  const today = useLocalToday(timezone);
  const showExplainer = !hasUiFlag(profile, 'dose_tap_explainer_seen');

  useEffect(() => {
    void fetchActiveMedications();
  }, [fetchActiveMedications]);

  const doseStatuses = useMemo(
    () => getOutstandingFirstDoseStatuses(medications, administrations, today, timezone),
    [medications, administrations, today, timezone],
  );

  const outstanding = useMemo(() => countDosesOutstandingToday(doseStatuses), [doseStatuses]);

  // A tap writes a row, so an unguarded double-tap logs two doses. With per-day counts on
  // screen that is now visible to the user, not just wrong in the data.
  const [pendingMedId, setPendingMedId] = useState<string | null>(null);

  const dismissExplainer = () => {
    setUiFlag('dose_tap_explainer_seen');
  };

  const handleChipTap = async (med: Medication, status: DoseStatus) => {
    if (pendingMedId !== null) return;
    setPendingMedId(med.id);
    try {
      await runChipTap(med, status);
    } finally {
      setPendingMedId(null);
    }
  };

  const runChipTap = async (med: Medication, status: DoseStatus) => {
    const latest = administrations
      .filter((a) => a.medication_id === med.id)
      .sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];

    // Tapping a satisfied chip corrects the last log; anything else records a new dose.
    if (!status.tapLogsDose && latest) {
      const removed = await undoLast(med.id);
      if (removed) {
        void tapLight();
        toast.success(`Removed dose · ${formatLogTime(latest.taken_at, timezone)}`);
      } else {
        toast.error('Could not undo dose');
      }
      return;
    }

    dismissExplainer();
    const created = await logAdministration(med.id);
    if (!created) {
      toast.error('Could not log dose');
      return;
    }

    void tapLight();
    const at = formatLogTime(created.taken_at, timezone);
    const remaining = status.expectedToday - status.takenToday - 1;
    if (status.cadence.kind === 'per_day' && remaining > 0) {
      toast.success(`Logged ${at} · ${remaining} more today`);
    } else if (status.cadence.intervalDays) {
      toast.success(`Logged ${at} · covered for ${status.cadence.intervalDays} days`);
    } else {
      toast.success(`Logged ${at}`);
    }
  };

  if (medsLoading || adminsLoading) return null;
  if (doseStatuses.length === 0) return null;
  if (hideWhenNothingDue && outstanding === 0) return null;

  return (
    <Card variant="elevated">
      <DashboardCardHeader
        icon={Pill}
        eyebrow="Dose log"
        title={title ?? 'Tap when you take your dose'}
        description={summaryCopy(outstanding, doseStatuses.length)}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {doseStatuses.map(({ medication, status }) => (
          <button
            key={medication.id}
            type="button"
            onClick={() => void handleChipTap(medication, status)}
            disabled={pendingMedId !== null}
            title={`${medication.medication_name} · ${status.cadence.label} · ${status.detail}`}
            aria-label={`${medication.medication_name}, ${status.cadence.label}, ${status.detail}`}
            aria-pressed={status.satisfied}
            className={`${chipClassName(status)} disabled:opacity-60`}
          >
            <span className="flex w-full min-w-0 items-center gap-1.5 text-sm font-medium">
              <span className="truncate">{medication.medication_name}</span>
              {status.satisfied && <span aria-hidden>✓</span>}
            </span>
            <span className="w-full truncate text-xs opacity-80">
              {status.cadence.label} · {status.detail}
            </span>
          </button>
        ))}
      </div>

      {showExplainer && (
        <p className="mt-3 text-xs leading-relaxed text-sage-500">
          Each chip shows its own schedule. Daily medications reset every day, multi-dose days count
          up as you log, and weekly or longer doses stay checked for the whole cycle. Tap a checked
          chip to undo the last log.
        </p>
      )}
    </Card>
  );
}
