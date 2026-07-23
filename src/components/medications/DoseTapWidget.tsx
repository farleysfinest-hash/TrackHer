import { useEffect, useMemo } from 'react';
import { Pill } from 'lucide-react';
import { useMedications } from '../../hooks/useMedications';
import { useMedicationAdministrations } from '../../hooks/useMedicationAdministrations';
import { useLocalToday } from '../../hooks/useLocalToday';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';
import { getResolvedTimezone } from '../../utils/checkinHelpers';
import { showDoseChip, isDoseLoggedForMed, getDoseCycleDays } from '../../utils/medicationHelpers';
import { tapLight } from '../../lib/haptics';
import type { Medication } from '../../types/database';
import { Card } from '../ui/Card';
import { DashboardCardHeader } from '../dashboard/DashboardCardHeader';

function formatLogTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

function shortMedName(name: string): string {
  if (name.length <= 18) return name;
  return `${name.slice(0, 16)}…`;
}

export function DoseTapWidget() {
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

  const chipMeds = useMemo(
    () => medications.filter(showDoseChip),
    [medications],
  );

  const dismissExplainer = () => {
    setUiFlag('dose_tap_explainer_seen');
  };

  const handleChipTap = async (med: Medication) => {
    const logged = isDoseLoggedForMed(med, administrations, today, timezone);
    const latest = administrations
      .filter((a) => a.medication_id === med.id)
      .sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];

    if (logged && latest) {
      const removed = await undoLast(med.id);
      if (removed) {
        toast.success(`Removed dose · ${formatLogTime(latest.taken_at, timezone)}`);
      } else {
        toast.error('Could not undo dose');
      }
      return;
    }

    dismissExplainer();
    const created = await logAdministration(med.id);
    if (created) {
      void tapLight();
      const cycleDays = getDoseCycleDays(med);
      toast.success(
        cycleDays
          ? `Logged — ${formatLogTime(created.taken_at, timezone)} · stays checked for this ${cycleDays}-day cycle`
          : `Logged — ${formatLogTime(created.taken_at, timezone)}`,
      );
    } else {
      toast.error('Could not log dose');
    }
  };

  if (medsLoading || adminsLoading) return null;
  if (chipMeds.length === 0) return null;

  return (
    <Card variant="elevated">
      <DashboardCardHeader
        icon={Pill}
        eyebrow="Dose log"
        title="Tap when you take your dose"
        description="Tap again to undo."
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {chipMeds.map((med) => {
          const checked = isDoseLoggedForMed(med, administrations, today, timezone);
          return (
            <button
              key={med.id}
              type="button"
              onClick={() => void handleChipTap(med)}
              title={med.medication_name}
              className={[
                'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.98]',
                checked
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-sage-200 bg-sage-50 text-sage-700 hover:border-sage-400 hover:bg-sage-100',
              ].join(' ')}
            >
              <span className="truncate">{shortMedName(med.medication_name)}</span>
              {checked && <span aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>

      {showExplainer && (
        <p className="mt-3 text-xs leading-relaxed text-sage-500">
          Weekly patches stay checked for the full dose cycle after you log — not just today.
          Tapping again removes that log.
        </p>
      )}
    </Card>
  );
}
