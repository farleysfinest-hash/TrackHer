import { useEffect, useState } from 'react';
import { useMedicationChanges, type MedicationChangeWithMed } from '../../hooks/useMedicationChanges';
import { useMedications } from '../../hooks/useMedications';
import { useToast } from '../../stores/toastStore';
import { formatDateLong } from '../../utils/formatters';
import {
  formatFrequency,
  getChangeTimelineColor,
} from '../../utils/medicationHelpers';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { MedicationChangeType } from '../../types/database';

function formatTimelineDescription(change: MedicationChangeWithMed): string {
  const med = change.medication;
  const name = med?.medication_name ?? 'Medication';
  const unit = med?.dose_unit ?? '';

  switch (change.change_type) {
    case 'started': {
      const dose = change.new_dose ?? med?.dose_amount;
      const freq = med ? formatFrequency(med.frequency) : '';
      const type = med
        ? `${med.hormone_category.charAt(0).toUpperCase() + med.hormone_category.slice(1)} ${med.delivery_method.replace(/_/g, ' ')}`
        : '';
      return `Started ${name}${dose != null ? ` ${dose} ${unit}` : ''}${freq ? ` (${freq})` : ''}${type ? ` — ${type}` : ''}`;
    }
    case 'stopped':
      return `Discontinued ${name}${change.notes ? `\nReason: ${change.notes}` : ''}`;
    case 'dose_increased':
      return `Increased ${name} from ${change.previous_dose} → ${change.new_dose} ${unit}${change.notes ? `\nReason: ${change.notes}` : ''}`;
    case 'dose_decreased':
      return `Decreased ${name} from ${change.previous_dose} → ${change.new_dose} ${unit}${change.notes ? `\nReason: ${change.notes}` : ''}`;
    case 'frequency_changed':
      return `Changed frequency for ${name}${change.notes ? `\n${change.notes}` : ''}`;
    case 'method_changed':
      return `Changed delivery method for ${name}`;
    case 'switched':
      return `Switched ${name}${change.notes ? `: ${change.notes}` : ''}`;
    default:
      return `${name} — ${change.change_type}`;
  }
}

interface MedicationHistoryProps {
  isExpanded: boolean;
}

export function MedicationHistory({ isExpanded }: MedicationHistoryProps) {
  const { changes, isLoading, fetchChanges } = useMedicationChanges();
  const { deleteMedication, error } = useMedications();
  const toast = useToast();
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      void fetchChanges();
    }
  }, [isExpanded, fetchChanges]);

  const handleConfirmDelete = async (change: MedicationChangeWithMed) => {
    const med = change.medication;
    if (!med) return;

    setIsDeleting(true);
    const ok = await deleteMedication(med.id);
    setIsDeleting(false);

    if (ok) {
      setPendingConfirmId(null);
      await fetchChanges({ force: true });
    } else {
      toast.error(error ?? 'Failed to delete medication');
    }
  };

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (changes.length === 0) {
    return <p className="py-4 text-sm text-sage-400">No medication history yet.</p>;
  }

  return (
    <div className="relative ml-3 border-l-2 border-sage-200 pl-6">
      {changes.map((change, index) => {
        const showDelete =
          change.change_type === 'stopped' &&
          change.medication != null &&
          change.medication.is_active === false;
        const medName = change.medication?.medication_name ?? 'Medication';
        const isConfirming = pendingConfirmId === change.id;

        return (
          <div key={change.id} className={`relative ${index < changes.length - 1 ? 'pb-8' : ''}`}>
            <span
              className={[
                'absolute -left-[31px] top-1 h-3 w-3 rounded-full',
                getChangeTimelineColor(change.change_type as MedicationChangeType),
              ].join(' ')}
            />
            <p className="text-sm font-medium text-sage-700">
              {formatDateLong(change.change_date)}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-sage-600">
              {formatTimelineDescription(change)}
            </p>
            {showDelete && (
              <div className="mt-2">
                {isConfirming ? (
                  <p className="text-xs text-sage-600">
                    Erases every record of {medName} — can&apos;t be undone.{' '}
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => void handleConfirmDelete(change)}
                      className="text-xs text-rose-700 underline hover:text-sage-600"
                    >
                      Confirm delete
                    </button>{' '}
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setPendingConfirmId(null)}
                      className="text-xs text-sage-400 underline hover:text-sage-600"
                    >
                      Cancel
                    </button>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingConfirmId(change.id)}
                    className="text-xs text-sage-400 underline hover:text-sage-600"
                  >
                    Delete permanently
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
