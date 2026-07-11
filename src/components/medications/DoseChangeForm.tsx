import { useMemo, useState } from 'react';
import type { Medication, MedicationFrequency } from '../../types/database';
import type { MedicationOption } from '../../types/medications';
import { useMedications } from '../../hooks/useMedications';
import { useToast } from '../../stores/toastStore';
import {
  catalogOffersDoseShortcuts,
  formatMedicationDoseDetail,
  getUnitsPerDose,
} from '../../utils/medicationHelpers';
import { todayISO } from '../../utils/localDate';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { FREQUENCY_OPTIONS } from '../../lib/medicationConstants';
import { DoseScheduleFields, type DoseScheduleValue } from './DoseScheduleFields';

type ChangeMode = 'dose' | 'frequency' | 'both';

interface DoseChangeFormProps {
  medication: Medication;
  catalogProduct?: MedicationOption;
  onCancel: () => void;
  onSuccess: () => void;
}

export function DoseChangeForm({
  medication,
  catalogProduct,
  onCancel,
  onSuccess,
}: DoseChangeFormProps) {
  const { changeDose, changeFrequency } = useMedications();
  const toast = useToast();
  const [mode, setMode] = useState<ChangeMode>('dose');

  const initialUseCustom = useMemo(() => {
    if (!catalogProduct || catalogProduct.allowCustomDose) return true;
    if (!catalogOffersDoseShortcuts(catalogProduct)) return true;
    return !catalogProduct.doseOptions.amounts.includes(medication.dose_amount);
  }, [catalogProduct, medication.dose_amount]);

  const [schedule, setSchedule] = useState<DoseScheduleValue>({
    dose_amount: medication.dose_amount,
    dose_unit: medication.dose_unit,
    units_per_dose: getUnitsPerDose(medication),
    use_custom_dose: initialUseCustom,
    frequency: medication.frequency,
    frequency_details: medication.frequency_details,
  });

  const [newFrequency, setNewFrequency] = useState<MedicationFrequency>(medication.frequency);
  const [effectiveDate, setEffectiveDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    let success = true;
    let lastError: string | undefined;

    if (mode === 'dose' || mode === 'both') {
      if (schedule.dose_amount === null) {
        setIsSaving(false);
        return;
      }
      const result = await changeDose(
        medication.id,
        {
          dose_amount: schedule.dose_amount,
          dose_unit: schedule.dose_unit,
          units_per_dose: schedule.units_per_dose,
          frequency_details: schedule.frequency_details,
        },
        effectiveDate,
        reason || undefined,
      );
      if (!result.ok) {
        success = false;
        lastError = result.error;
      }
    }

    if (mode === 'frequency' || mode === 'both') {
      const frequencyToApply = mode === 'both' ? schedule.frequency! : newFrequency;
      const result = await changeFrequency(
        medication.id,
        frequencyToApply,
        schedule.frequency_details ?? undefined,
        effectiveDate,
        reason || undefined,
      );
      if (!result.ok) {
        success = false;
        lastError = result.error;
      }
    }

    setIsSaving(false);

    if (success) {
      toast.success('Medication updated successfully');
      onSuccess();
    } else {
      toast.error(lastError ?? 'Failed to update medication');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-medium text-sage-800">Change dose or frequency</h4>
      <p className="text-sm text-sage-500">
        Current: {formatMedicationDoseDetail(medication)}
      </p>

      <div className="flex gap-2">
        {(['dose', 'frequency', 'both'] as ChangeMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              'rounded-lg px-3 py-1.5 text-sm capitalize',
              mode === m ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600',
            ].join(' ')}
          >
            {m}
          </button>
        ))}
      </div>

      {(mode === 'dose' || mode === 'both') && (
        <DoseScheduleFields
          product={catalogProduct}
          deliveryMethod={medication.delivery_method}
          value={schedule}
          onChange={(updates) => setSchedule((prev) => ({ ...prev, ...updates }))}
          showFrequency={mode === 'both'}
        />
      )}

      {(mode === 'frequency' || mode === 'both') && mode !== 'both' && (
        <Select
          label="New frequency"
          value={newFrequency}
          onChange={(e) => setNewFrequency(e.target.value as MedicationFrequency)}
          options={FREQUENCY_OPTIONS}
        />
      )}

      <Input
        label="Effective date"
        type="date"
        max={todayISO()}
        value={effectiveDate}
        onChange={(e) => setEffectiveDate(e.target.value)}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-sage-700">
          Reason for change (optional)
        </label>
        <textarea
          className="w-full rounded-lg border border-sand-200 px-4 py-3 text-sm focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" isLoading={isSaving} loadingText="Updating...">
          Update
        </Button>
      </div>
    </form>
  );
}
