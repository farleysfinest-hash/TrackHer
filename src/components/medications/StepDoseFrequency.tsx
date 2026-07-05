import { useMemo } from 'react';
import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { APPLICATION_SITE_LABELS } from '../../lib/medicationConstants';
import { needsApplicationSite, getPelletReplacementDate } from '../../utils/medicationHelpers';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { PelletFields } from './PelletFields';
import { CombinationPelletFields } from './CombinationPelletFields';
import { validators } from '../../utils/validation';

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

  const doseOptions = useMemo(() => {
    if (!product || product.allowCustomDose) return [];
    return product.doseOptions.amounts.map((amount) => ({
      value: String(amount),
      label: `${amount} ${product.doseOptions.unit}`,
    }));
  }, [product]);

  const frequencyOptions = useMemo(() => {
    if (!product) return [];
    const labels: Record<string, string> = {
      daily: 'Daily',
      twice_daily: 'Twice daily',
      weekly: 'Once weekly',
      twice_weekly: 'Twice weekly',
      cyclic: 'Cyclic',
      custom: 'Custom schedule',
      every_three_months: 'Every 3 months',
      every_four_months: 'Every 4 months',
      every_five_months: 'Every 5 months',
      every_six_months: 'Every 6 months',
    };
    return product.frequencyOptions.map((f) => ({
      value: f,
      label: labels[f] ?? f.replace(/_/g, ' '),
    }));
  }, [product]);

  const siteOptions = useMemo(() => {
    const sites = product?.applicationSites ?? [];
    return sites.map((s) => ({
      value: s,
      label: APPLICATION_SITE_LABELS[s] ?? s.replace(/_/g, ' '),
    }));
  }, [product]);

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
        <>
          {product.allowCustomDose ? (
            <div className="flex gap-3">
              <Input
                label="Dose amount"
                type="number"
                step="any"
                min="0"
                value={formData.dose_amount ?? ''}
                onChange={(e) =>
                  updateFormData({ dose_amount: e.target.value ? Number(e.target.value) : null })
                }
                className="flex-1"
              />
              <Input
                label="Unit"
                value={formData.dose_unit || product.doseOptions.unit}
                onChange={(e) => updateFormData({ dose_unit: e.target.value })}
                className="w-32"
              />
            </div>
          ) : (
            <Select
              label="Dose"
              value={formData.dose_amount !== null ? String(formData.dose_amount) : ''}
              onChange={(e) => updateFormData({ dose_amount: Number(e.target.value) })}
              placeholder="Select dose"
              options={doseOptions}
            />
          )}

          <Select
            label="Frequency"
            value={formData.frequency ?? ''}
            onChange={(e) =>
              updateFormData({
                frequency: e.target.value as typeof formData.frequency,
              })
            }
            placeholder="Select frequency"
            options={frequencyOptions}
          />

          {formData.frequency === 'cyclic' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Days on"
                type="number"
                min="1"
                value={(formData.frequency_details?.days_on as number) ?? ''}
                onChange={(e) =>
                  updateFormData({
                    frequency_details: {
                      ...formData.frequency_details,
                      days_on: Number(e.target.value),
                    },
                  })
                }
              />
              <Input
                label="Days off"
                type="number"
                min="1"
                value={(formData.frequency_details?.days_off as number) ?? ''}
                onChange={(e) =>
                  updateFormData({
                    frequency_details: {
                      ...formData.frequency_details,
                      days_off: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          )}

          {formData.frequency === 'custom' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-sage-700">
                Describe your schedule
              </label>
              <textarea
                className="w-full rounded-lg border border-sand-200 bg-white px-4 py-3 text-sage-800 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                rows={3}
                value={(formData.frequency_details?.notes as string) ?? ''}
                onChange={(e) =>
                  updateFormData({
                    frequency_details: { notes: e.target.value },
                  })
                }
              />
            </div>
          )}
        </>
      )}

      <Input
        label="Start date"
        type="date"
        max={new Date().toISOString().split('T')[0]}
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
        <Button disabled={!canContinue} onClick={handleNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
