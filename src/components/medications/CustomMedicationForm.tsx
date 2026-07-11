import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { HORMONE_CATEGORIES, DELIVERY_METHOD_LABELS } from '../../lib/medicationConstants';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { DoseScheduleFields } from './DoseScheduleFields';
import { validators } from '../../utils/validation';
import { todayISO } from '../../utils/localDate';
import type { HormoneCategory, DeliveryMethod } from '../../types/database';

interface CustomMedicationFormProps {
  onBack: () => void;
  onNext: () => void;
}

export function CustomMedicationForm({ onBack, onNext }: CustomMedicationFormProps) {
  const { formData, updateFormData, selectedHormone, selectedMethod } = useMedicationEntryStore();

  const hormoneOptions = HORMONE_CATEGORIES.filter((c) => c.value !== 'other').map((c) => ({
    value: c.value,
    label: c.label,
  }));

  const methodOptions = Object.entries(DELIVERY_METHOD_LABELS).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  const canContinue =
    formData.custom_medication_name.trim() !== '' &&
    (formData.custom_hormone_category ?? selectedHormone) !== null &&
    (formData.custom_delivery_method ?? selectedMethod) !== null &&
    formData.dose_amount !== null &&
    formData.dose_unit.trim() !== '' &&
    formData.frequency !== null &&
    formData.start_date !== '' &&
    !validators.dateNotFuture(formData.start_date);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Custom medication</h2>
        <p className="mt-2 text-sage-500">Enter the details for your medication.</p>
      </div>

      <Input
        label="Medication name"
        value={formData.custom_medication_name}
        onChange={(e) => updateFormData({ custom_medication_name: e.target.value })}
        placeholder="e.g., My compounded cream"
      />

      <Select
        label="Hormone category"
        value={formData.custom_hormone_category ?? selectedHormone ?? ''}
        onChange={(e) =>
          updateFormData({ custom_hormone_category: e.target.value as HormoneCategory })
        }
        placeholder="Select category"
        options={hormoneOptions}
      />

      <Select
        label="Delivery method"
        value={formData.custom_delivery_method ?? selectedMethod ?? ''}
        onChange={(e) =>
          updateFormData({ custom_delivery_method: e.target.value as DeliveryMethod })
        }
        placeholder="Select method"
        options={methodOptions}
      />

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input
            type="checkbox"
            checked={formData.custom_is_bioidentical}
            onChange={(e) => updateFormData({ custom_is_bioidentical: e.target.checked })}
            className="rounded border-sand-300 text-sage-500"
          />
          Bioidentical
        </label>
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input
            type="checkbox"
            checked={formData.custom_is_compounded}
            onChange={(e) => updateFormData({ custom_is_compounded: e.target.checked })}
            className="rounded border-sand-300 text-sage-500"
          />
          Compounded
        </label>
      </div>

      <DoseScheduleFields
        deliveryMethod={formData.custom_delivery_method ?? selectedMethod ?? undefined}
        value={{
          dose_amount: formData.dose_amount,
          dose_unit: formData.dose_unit,
          units_per_dose: formData.units_per_dose,
          use_custom_dose: true,
          frequency: formData.frequency,
          frequency_details: formData.frequency_details,
        }}
        onChange={(updates) => updateFormData(updates)}
      />

      <Input
        label="Start date"
        type="date"
        max={todayISO()}
        value={formData.start_date}
        onChange={(e) => updateFormData({ start_date: e.target.value })}
      />

      {formData.custom_is_compounded && (
        <Input
          label="Compounding pharmacy (optional)"
          value={formData.pharmacy_name}
          onChange={(e) => updateFormData({ pharmacy_name: e.target.value })}
        />
      )}

      <Input
        label="Prescriber name (optional)"
        value={formData.prescriber_name}
        onChange={(e) => updateFormData({ prescriber_name: e.target.value })}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-sage-700">Notes (optional)</label>
        <textarea
          className="w-full rounded-lg border border-sand-200 bg-white px-4 py-3 text-sage-800 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          rows={3}
          value={formData.notes}
          onChange={(e) => updateFormData({ notes: e.target.value })}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button disabled={!canContinue} onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
