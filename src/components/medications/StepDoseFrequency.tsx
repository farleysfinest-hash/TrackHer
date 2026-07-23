import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { APPLICATION_SITE_LABELS } from '../../lib/medicationConstants';
import { needsApplicationSite, getPelletReplacementDate } from '../../utils/medicationHelpers';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { PelletFields } from './PelletFields';
import { CombinationPelletFields } from './CombinationPelletFields';
import { DoseScheduleFields } from './DoseScheduleFields';
import { validators } from '../../utils/validation';
import { todayISO } from '../../utils/localDate';

interface StepDoseFrequencyProps {
  onBack: () => void;
  onNext: () => void;
}

export function StepDoseFrequency({ onBack, onNext }: StepDoseFrequencyProps) {
  const { selectedProduct, selectedMethod, selectedHormone, formData, updateFormData } =
    useMedicationEntryStore();

  const product = selectedProduct;
  const showApplicationSite = selectedMethod && needsApplicationSite(selectedMethod);
  const showPelletFields = selectedMethod === 'pellet';
  const showCombinationPellet =
    selectedHormone === 'combination' && selectedMethod === 'pellet';

  const siteOptions =
    product?.applicationSites?.map((s) => ({
      value: s,
      label: APPLICATION_SITE_LABELS[s] ?? s.replace(/_/g, ' '),
    })) ?? [];

  const replacementDate =
    formData.pellet_insertion_date && formData.pellet_expected_duration_months
      ? getPelletReplacementDate(
          formData.pellet_insertion_date,
          formData.pellet_expected_duration_months,
        )
      : null;

  const canContinue = showCombinationPellet
    ? formData.dose_amount !== null &&
      formData.secondary_dose_amount !== null &&
      formData.frequency !== null &&
      formData.start_date !== '' &&
      !validators.dateNotFuture(formData.start_date)
    : formData.dose_amount !== null &&
      formData.frequency !== null &&
      formData.start_date !== '' &&
      !validators.dateNotFuture(formData.start_date);

  const handleNext = () => {
    if (!canContinue) return;
    onNext();
  };

  if (!product) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Dose & schedule</h2>
        <p className="mt-2 text-sage-500">
          Enter your prescribed dose and how often you take {product.name}.
        </p>
      </div>

      {showCombinationPellet ? (
        <CombinationPelletFields />
      ) : (
        <DoseScheduleFields
          product={product}
          deliveryMethod={selectedMethod ?? product.deliveryMethod}
          value={{
            dose_amount: formData.dose_amount,
            dose_unit: formData.dose_unit,
            units_per_dose: formData.units_per_dose,
            use_custom_dose: formData.use_custom_dose,
            frequency: formData.frequency,
            frequency_details: formData.frequency_details,
          }}
          onChange={(updates) => updateFormData(updates)}
        />
      )}

      <Input
        label="Start date"
        type="date"
        max={todayISO()}
        value={formData.start_date}
        onChange={(e) => updateFormData({ start_date: e.target.value })}
      />

      {showApplicationSite && siteOptions.length > 0 && (
        <Select
          label="Application site"
          value={formData.application_site ?? ''}
          onChange={(e) => updateFormData({ application_site: e.target.value })}
          placeholder="Select site"
          options={siteOptions}
        />
      )}

      {showApplicationSite && siteOptions.length === 0 && (
        <Input
          label="Application site"
          value={formData.application_site ?? ''}
          onChange={(e) => updateFormData({ application_site: e.target.value })}
        />
      )}

      {showPelletFields && !showCombinationPellet && (
        <PelletFields
          insertionDate={formData.pellet_insertion_date ?? formData.start_date}
          durationMonths={formData.pellet_expected_duration_months}
          durationOptions={product.durationOptions ?? [3, 4, 5, 6]}
          replacementDate={replacementDate}
          onInsertionDateChange={(date) => updateFormData({ pellet_insertion_date: date })}
          onDurationChange={(months) =>
            updateFormData({ pellet_expected_duration_months: months })
          }
        />
      )}

      {product.isCompounded && (
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
          className="w-full rounded-lg border border-sand-200 bg-white px-4 py-3 text-base text-sage-800 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
          rows={3}
          value={formData.notes}
          onChange={(e) => updateFormData({ notes: e.target.value })}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button disabled={!canContinue} onClick={handleNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
