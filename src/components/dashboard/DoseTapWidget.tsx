import { useEffect, useMemo, useState } from 'react';
import { Pill } from 'lucide-react';
import { useMedications } from '../../hooks/useMedications';
import { useMedicationAdministrations } from '../../hooks/useMedicationAdministrations';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { showDoseChip, isDoseLoggedForMed } from '../../utils/medicationHelpers';
import type { Medication } from '../../types/database';

const EXPLAINER_KEY = 'trackher_dose_tap_explainer_seen';
const UNDO_WINDOW_MS = 10 * 60 * 1000;

function formatLogTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
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
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const today = getLocalDateISO(timezone);

  const [showExplainer, setShowExplainer] = useState(
    () => localStorage.getItem(EXPLAINER_KEY) !== 'true',
  );

  useEffect(() => {
    void fetchActiveMedications();
  }, [fetchActiveMedications]);

  const chipMeds = useMemo(
    () => medications.filter(showDoseChip),
    [medications],
  );

  const dismissExplainer = () => {
    localStorage.setItem(EXPLAINER_KEY, 'true');
    setShowExplainer(false);
  };

  const handleChipTap = async (med: Medication) => {
    const logged = isDoseLoggedForMed(med, administrations, today);
    const latest = administrations
      .filter((a) => a.medication_id === med.id)
      .sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];

    if (logged && latest) {
      const elapsed = Date.now() - new Date(latest.taken_at).getTime();
      if (elapsed <= UNDO_WINDOW_MS) {
        toast.success(`Logged — ${formatLogTime(latest.taken_at, timezone)}`, {
          label: 'Undo',
          onClick: () => {
            void undoLast(med.id);
          },
        });
        return;
      }
      return;
    }

    dismissExplainer();
    const created = await logAdministration(med.id);
    if (created) {
      toast.success(`Logged — ${formatLogTime(created.taken_at, timezone)}`);
    } else {
      toast.error('Could not log dose');
    }
  };

  if (medsLoading || adminsLoading) return null;
  if (chipMeds.length === 0) return null;

  return (
    <section className="rounded-xl border border-sand-200 bg-white p-5">
      <h2 className="font-display text-lg text-sage-800">Dose log</h2>
      <p className="mt-1 text-sm text-sage-500">Tap when you take your dose.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {chipMeds.map((med) => {
          const checked = isDoseLoggedForMed(med, administrations, today);
          return (
            <button
              key={med.id}
              type="button"
              onClick={() => void handleChipTap(med)}
              className={[
                'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors active:scale-[0.98]',
                checked
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-sage-200 bg-sage-50 text-sage-700 hover:border-sage-400 hover:bg-sage-100',
              ].join(' ')}
            >
              <Pill className="h-4 w-4" aria-hidden />
              {med.medication_name}
              {checked && <span aria-hidden> ✓</span>}
            </button>
          );
        })}
      </div>

      {showExplainer && (
        <p className="mt-3 text-xs leading-relaxed text-sage-500">
          Tapping when you take your dose builds the timing data that makes patterns like
          end-of-cycle dips visible.
        </p>
      )}
    </section>
  );
}
