import { useState } from 'react';
import type { Medication } from '../../types/database';
import { useMedications } from '../../hooks/useMedications';
import { useToast } from '../../stores/toastStore';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DISCONTINUE_REASONS } from '../../lib/medicationConstants';
import { formatMedicationDoseShort } from '../../utils/medicationHelpers';

interface DiscontinueModalProps {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DiscontinueModal({
  medication,
  isOpen,
  onClose,
  onSuccess,
}: DiscontinueModalProps) {
  const { discontinueMedication } = useMedications();
  const toast = useToast();
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reasonType, setReasonType] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!medication) return null;

  const reasonLabel = DISCONTINUE_REASONS.find((r) => r.value === reasonType)?.label;
  const fullReason =
    reasonType === 'other'
      ? otherReason
      : reasonLabel
        ? reasonLabel + (otherReason ? `: ${otherReason}` : '')
        : otherReason;

  const handleDiscontinue = async () => {
    setIsSaving(true);
    const ok = await discontinueMedication(medication.id, endDate, fullReason || undefined);
    setIsSaving(false);

    if (ok) {
      toast.success('Medication discontinued');
      onSuccess();
      onClose();
    } else {
      toast.error('Failed to discontinue medication');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Discontinue Medication" size="md">
      <div className="space-y-4">
        <p className="text-sage-600">
          Are you sure you want to discontinue{' '}
          <strong>
            {medication.medication_name} ({formatMedicationDoseShort(medication)})
          </strong>
          ?
        </p>

        <Input
          label="Last date taken"
          type="date"
          max={new Date().toISOString().split('T')[0]}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-sage-700">Reason (optional)</legend>
          <div className="space-y-2">
            {DISCONTINUE_REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm text-sage-600">
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reasonType === r.value}
                  onChange={() => setReasonType(r.value)}
                  className="text-sage-500"
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        {reasonType === 'other' && (
          <Input
            label="Please describe"
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
          />
        )}

        <p className="text-sm italic text-sage-400">
          This won&apos;t delete your medication history — it will be marked as discontinued and
          remain visible in your medication timeline.
        </p>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDiscontinue}
            isLoading={isSaving}
            loadingText="Discontinuing..."
            className="flex-1"
          >
            Discontinue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
