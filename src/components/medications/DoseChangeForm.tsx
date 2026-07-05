import { useState } from 'react';
import type { Medication } from '../../types/database';
import type { MedicationOption } from '../../types/medications';
import type { MedicationFrequency } from '../../types/database';
import { useMedications } from '../../hooks/useMedications';
import { useToast } from '../../stores/toastStore';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { FREQUENCY_OPTIONS } from '../../lib/medicationConstants';

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
  const [newDose, setNewDose] = useState<string>(
    catalogProduct?.allowCustomDose ? String(medication.dose_amount) : String(medication.dose_amount),
  );
  const [customDose, setCustomDose] = useState(String(medication.dose_amount));
  const [newFrequency, setNewFrequency] = useState<MedicationFrequency>(medication.frequency);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const doseOptions =
    catalogProduct && !catalogProduct.allowCustomDose
      ? catalogProduct.doseOptions.amounts.map((a) => ({
          value: String(a),
          label: `${a} ${catalogProduct.doseOptions.unit}`,
        }))
      : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    let success = true;

    if (mode === 'dose' || mode === 'both') {
      const doseVal = catalogProduct?.allowCustomDose
        ? Number(customDose)
        : Number(newDose);
      const ok = await changeDose(
        medication.id,
        doseVal,
        medication.dose_unit,
        effectiveDate,
        reason || undefined,
      );
      if (!ok) success = false;
    }

    if (mode === 'frequency' || mode === 'both') {
      const ok = await changeFrequency(
        medication.id,
        newFrequency,
        medication.frequency_details ?? undefined,
        effectiveDate,
        reason || undefined,
      );
      if (!ok) success = false;
    }

    setIsSaving(false);

    if (success) {
      toast.success('Medication updated successfully');
      onSuccess();
    } else {
      toast.error('Failed to update medication');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-medium text-sage-800">Change dose or frequency</h4>
      <p className="text-sm text-sage-500">
        Current: {medication.dose_amount} {medication.dose_unit}
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

      {(mode === 'dose' || mode === 'both') &&
        (catalogProduct?.allowCustomDose || doseOptions.length === 0 ? (
          <Input
            label="New dose"
            type="number"
            step="any"
            value={customDose}
            onChange={(e) => setCustomDose(e.target.value)}
          />
        ) : (
          <Select
            label="New dose"
            value={newDose}
            onChange={(e) => setNewDose(e.target.value)}
            options={doseOptions}
          />
        ))}

      {(mode === 'frequency' || mode === 'both') && (
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
        max={new Date().toISOString().split('T')[0]}
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
