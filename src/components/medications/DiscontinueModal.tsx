import { useEffect, useState } from 'react';
import type { Medication } from '../../types/database';
import { useMedications } from '../../hooks/useMedications';
import { useToast } from '../../stores/toastStore';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DISCONTINUE_REASONS } from '../../lib/medicationConstants';
import { formatMedicationDoseShort } from '../../utils/medicationHelpers';
import { todayISO } from '../../utils/localDate';

type RemovalStep = 'choose' | 'discontinue' | 'confirmDelete';

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
  const { discontinueMedication, deleteMedication, error } = useMedications();
  const toast = useToast();
  const [step, setStep] = useState<RemovalStep>('choose');
  const [endDate, setEndDate] = useState(todayISO());
  const [reasonType, setReasonType] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('choose');
      setEndDate(todayISO());
      setReasonType('');
      setOtherReason('');
    }
  }, [isOpen]);

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
    const result = await discontinueMedication(medication.id, endDate, fullReason || undefined);
    setIsSaving(false);

    if (result.ok) {
      toast.success('Medication discontinued');
      onSuccess();
      onClose();
    } else {
      toast.error(result.error ?? 'Failed to discontinue medication');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await deleteMedication(medication.id);
    setIsDeleting(false);

    if (ok) {
      toast.success('Medication deleted');
      onSuccess();
      onClose();
    } else {
      toast.error(error ?? 'Failed to delete medication');
    }
  };

  const modalTitle =
    step === 'choose'
      ? `Remove ${medication.medication_name}?`
      : step === 'discontinue'
        ? 'Discontinue Medication'
        : 'Delete permanently';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
      {step === 'choose' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep('discontinue')}
            className="w-full rounded-lg border border-sage-200 p-4 text-left hover:bg-sage-50"
          >
            <p className="font-medium text-sage-800">Stop taking it, keep the record</p>
            <p className="mt-1 text-sm text-sage-600">
              Marks it discontinued. Its history stays in your timeline, your patterns, and your
              provider reports.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStep('confirmDelete')}
            className="w-full rounded-lg border border-sage-200 p-4 text-left hover:bg-sage-50"
          >
            <p className="font-medium text-sage-800">Delete it completely</p>
            <p className="mt-1 text-sm text-sage-600">
              Permanently erases this medication and everything it contributed — dose history,
              changes, and its part in your patterns and reports. This can&apos;t be undone.
            </p>
          </button>

          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
        </div>
      )}

      {step === 'discontinue' && (
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
            max={todayISO()}
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
            <Button variant="secondary" onClick={() => setStep('choose')} className="flex-1">
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
      )}

      {step === 'confirmDelete' && (
        <div className="space-y-4">
          <p className="text-sage-600">
            Delete {medication.medication_name} ({formatMedicationDoseShort(medication)})
            permanently? Every record of it will be erased. This can&apos;t be undone.
          </p>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep('choose')} className="flex-1">
              Go back
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              loadingText="Deleting..."
              className="flex-1"
            >
              Delete permanently
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
