import { useState } from 'react';
import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { useMedications } from '../../hooks/useMedications';
import { useToast } from '../../stores/toastStore';
import {
  formatFrequency,
  formatApplicationSite,
  getHormoneLabel,
} from '../../utils/medicationHelpers';
import { DELIVERY_METHOD_LABELS } from '../../lib/medicationConstants';
import { formatDateLong } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { MedicationInsert } from '../../types/database';

interface StepReviewProps {
  onBack: () => void;
  onSuccess: () => void;
  onAddAnother: () => void;
}

export function StepReview({ onBack, onSuccess, onAddAnother }: StepReviewProps) {
  const {
    selectedProduct,
    selectedHormone,
    selectedMethod,
    isCustomEntry,
    formData,
  } = useMedicationEntryStore();
  const { addMedication } = useMedications();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const medicationName = isCustomEntry
    ? formData.custom_medication_name
    : selectedProduct?.name ?? 'Unknown';

  const hormoneCategory = isCustomEntry
    ? formData.custom_hormone_category ?? 'other'
    : selectedHormone ?? selectedProduct?.hormoneCategory ?? 'other';

  const deliveryMethod = isCustomEntry
    ? formData.custom_delivery_method ?? 'other'
    : selectedMethod ?? selectedProduct?.deliveryMethod ?? 'other';

  const typeLabel = `${getHormoneLabel(hormoneCategory)} ${DELIVERY_METHOD_LABELS[deliveryMethod]?.label ?? deliveryMethod}`;

  const buildInsert = (): MedicationInsert | null => {
    if (formData.dose_amount === null || !formData.frequency) return null;

    return {
      hormone_category: hormoneCategory,
      delivery_method: deliveryMethod,
      medication_name: medicationName,
      dose_amount: formData.dose_amount,
      dose_unit: formData.dose_unit || selectedProduct?.doseOptions.unit || 'mg',
      secondary_dose_amount: formData.secondary_dose_amount ?? undefined,
      secondary_dose_unit: formData.secondary_dose_unit ?? undefined,
      tertiary_dose_amount: formData.tertiary_dose_amount ?? undefined,
      tertiary_dose_unit: formData.tertiary_dose_unit ?? undefined,
      frequency: formData.frequency,
      frequency_details: formData.frequency_details ?? undefined,
      application_site: formData.application_site ?? undefined,
      start_date: formData.start_date,
      prescriber_name: formData.prescriber_name || undefined,
      pharmacy_name: formData.pharmacy_name || undefined,
      notes: formData.notes || undefined,
      pellet_insertion_date: formData.pellet_insertion_date ?? undefined,
      pellet_expected_duration_months: formData.pellet_expected_duration_months ?? undefined,
      is_active: true,
    };
  };

  const handleSave = async () => {
    const insert = buildInsert();
    if (!insert) return;

    setIsSaving(true);
    const result = await addMedication(insert);
    setIsSaving(false);

    if (result) {
      toast.success('Medication added successfully');
      setSaved(true);
    } else {
      toast.error('Failed to add medication');
    }
  };

  if (saved) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="font-display text-2xl text-sage-800">Medication saved!</h2>
        <p className="text-sage-500">{medicationName} has been added to your regimen.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={onSuccess}>Done</Button>
          <Button variant="secondary" onClick={onAddAnother}>
            Add Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Review your medication</h2>
        <p className="mt-2 text-sage-500">Confirm the details before saving.</p>
      </div>

      <Card>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-sage-500">Medication</dt>
            <dd className="font-medium text-sage-800">{medicationName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sage-500">Type</dt>
            <dd className="font-medium text-sage-800">{typeLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sage-500">Dose</dt>
            <dd className="font-medium text-sage-800">
              {formData.dose_amount} {formData.dose_unit || selectedProduct?.doseOptions.unit}
              {formData.secondary_dose_amount != null &&
                ` + ${formData.secondary_dose_amount} ${formData.secondary_dose_unit}`}
              {formData.tertiary_dose_amount != null &&
                ` + ${formData.tertiary_dose_amount} ${formData.tertiary_dose_unit}`}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sage-500">Frequency</dt>
            <dd className="font-medium text-sage-800">
              {formData.frequency ? formatFrequency(formData.frequency) : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sage-500">Started</dt>
            <dd className="font-medium text-sage-800">{formatDateLong(formData.start_date)}</dd>
          </div>
          {formData.application_site && (
            <div className="flex justify-between gap-4">
              <dt className="text-sage-500">Applied to</dt>
              <dd className="font-medium text-sage-800">
                {formatApplicationSite(formData.application_site)}
              </dd>
            </div>
          )}
          {formData.prescriber_name && (
            <div className="flex justify-between gap-4">
              <dt className="text-sage-500">Prescriber</dt>
              <dd className="font-medium text-sage-800">{formData.prescriber_name}</dd>
            </div>
          )}
        </dl>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button isLoading={isSaving} loadingText="Saving..." onClick={handleSave} className="flex-1">
          Save & Add
        </Button>
      </div>
    </div>
  );
}
