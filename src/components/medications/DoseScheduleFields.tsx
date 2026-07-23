import { useMemo } from 'react';
import type { DeliveryMethod, MedicationFrequency } from '../../types/database';
import type { MedicationOption } from '../../types/medications';
import {
  catalogHasFixedDoses,
  catalogOffersDoseShortcuts,
  formatTimeOfDay,
  getTotalPerAdministration,
  supportsUnitsPerDose,
} from '../../utils/medicationHelpers';
import {
  FREQUENCY_OPTIONS,
  TIME_OF_DAY_OPTIONS,
  UNITS_PER_DOSE_OPTIONS,
} from '../../lib/medicationConstants';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  twice_daily: 'Twice daily',
  three_times_daily: 'Three times daily',
  weekly: 'Once weekly',
  twice_weekly: 'Twice weekly',
  three_times_weekly: 'Three times weekly',
  every_other_day: 'Every other day',
  every_two_weeks: 'Every 2 weeks',
  every_three_weeks: 'Every 3 weeks',
  every_four_weeks: 'Every 4 weeks',
  monthly: 'Monthly',
  cyclic: 'Cyclic (days on / off)',
  as_needed: 'As needed',
  custom: 'Custom schedule',
  every_three_months: 'Every 3 months',
  every_four_months: 'Every 4 months',
  every_five_months: 'Every 5 months',
  every_six_months: 'Every 6 months',
};

export interface DoseScheduleValue {
  dose_amount: number | null;
  dose_unit: string;
  units_per_dose: number;
  use_custom_dose: boolean;
  frequency: MedicationFrequency | null;
  frequency_details: Record<string, unknown> | null;
}

interface DoseScheduleFieldsProps {
  product?: MedicationOption | null;
  deliveryMethod?: DeliveryMethod | null;
  value: DoseScheduleValue;
  onChange: (updates: Partial<DoseScheduleValue>) => void;
  frequencyOptions?: MedicationFrequency[];
  showFrequency?: boolean;
}

export function DoseScheduleFields({
  product,
  deliveryMethod,
  value,
  onChange,
  frequencyOptions,
  showFrequency = true,
}: DoseScheduleFieldsProps) {
  const method = deliveryMethod ?? product?.deliveryMethod ?? null;
  const unit = value.dose_unit || product?.doseOptions.unit || 'mg';
  const showUnitsPerDose = method ? supportsUnitsPerDose(method) : false;
  const hasCatalogShortcuts = product ? catalogOffersDoseShortcuts(product) : false;
  const fixedCatalogOnly = product ? catalogHasFixedDoses(product) : false;
  const showCatalogSelect = hasCatalogShortcuts && !value.use_custom_dose && !product?.allowCustomDose;
  const showCustomInput =
    value.use_custom_dose || product?.allowCustomDose || !hasCatalogShortcuts;

  const catalogDoseOptions = useMemo(() => {
    if (!product) return [];
    return product.doseOptions.amounts.map((amount) => ({
      value: String(amount),
      label: `${amount} ${product.doseOptions.unit}`,
    }));
  }, [product]);

  const frequencySelectOptions = useMemo(() => {
    const options =
      frequencyOptions ?? product?.frequencyOptions ?? FREQUENCY_OPTIONS.map((o) => o.value);
    return options.map((f) => ({
      value: f,
      label: FREQUENCY_LABELS[f] ?? f.replace(/_/g, ' '),
    }));
  }, [frequencyOptions, product]);

  const timeOfDay = (value.frequency_details?.time_of_day as string) ?? '';
  const preview =
    value.dose_amount !== null
      ? showFrequency && value.frequency
        ? buildDosePreview(value, unit)
        : buildStrengthPreview(value, unit)
      : null;

  return (
    <div className="space-y-4">
      {showCatalogSelect && (
        <Select
          label="Strength per unit"
          value={value.dose_amount !== null ? String(value.dose_amount) : ''}
          onChange={(e) => onChange({ dose_amount: Number(e.target.value), use_custom_dose: false })}
          placeholder="Select strength"
          options={catalogDoseOptions}
        />
      )}

      {hasCatalogShortcuts && !product?.allowCustomDose && (
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input
            type="checkbox"
            checked={value.use_custom_dose}
            onChange={(e) =>
              onChange({
                use_custom_dose: e.target.checked,
                dose_amount: e.target.checked ? value.dose_amount : null,
              })
            }
            className="rounded border-sand-300 text-sage-500"
          />
          Use custom strength (not listed above)
        </label>
      )}

      {showCustomInput && (
        <div className="flex gap-3">
          <Input
            label={fixedCatalogOnly ? 'Custom strength' : 'Strength per unit'}
            type="number"
            step="any"
            min="0"
            value={value.dose_amount ?? ''}
            onChange={(e) =>
              onChange({
                dose_amount: e.target.value ? Number(e.target.value) : null,
                use_custom_dose: hasCatalogShortcuts ? true : value.use_custom_dose,
              })
            }
            className="flex-1"
          />
          <Input
            label="Unit"
            value={unit}
            onChange={(e) => onChange({ dose_unit: e.target.value })}
            className="w-32"
          />
        </div>
      )}

      {product?.doseOptions.description && (
        <p className="text-sm text-sage-500">{product.doseOptions.description}</p>
      )}

      {showUnitsPerDose && (
        <Select
          label="How many per dose?"
          value={String(value.units_per_dose)}
          onChange={(e) => onChange({ units_per_dose: Number(e.target.value) })}
          options={UNITS_PER_DOSE_OPTIONS.map((o) => ({
            value: o.value,
            label:
              o.value === '1'
                ? '1 (e.g. one capsule)'
                : `${o.label} (e.g. ${o.label} capsules at once)`,
          }))}
        />
      )}

      {showFrequency && (
        <>
          <Select
            label="How often?"
            value={value.frequency ?? ''}
            onChange={(e) => onChange({ frequency: e.target.value as MedicationFrequency })}
            placeholder="Select frequency"
            options={frequencySelectOptions}
          />

          <Select
            label="Time of day (optional)"
            value={timeOfDay}
            onChange={(e) =>
              onChange({
                frequency_details: {
                  ...value.frequency_details,
                  time_of_day: e.target.value || undefined,
                },
              })
            }
            options={TIME_OF_DAY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />

          {value.frequency === 'cyclic' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Days on"
                type="number"
                min="1"
                value={(value.frequency_details?.days_on as number) ?? ''}
                onChange={(e) =>
                  onChange({
                    frequency_details: {
                      ...value.frequency_details,
                      days_on: Number(e.target.value),
                    },
                  })
                }
              />
              <Input
                label="Days off"
                type="number"
                min="1"
                value={(value.frequency_details?.days_off as number) ?? ''}
                onChange={(e) =>
                  onChange({
                    frequency_details: {
                      ...value.frequency_details,
                      days_off: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          )}

          {value.frequency === 'custom' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-sage-700">
                Describe your schedule
              </label>
              <textarea
                className="w-full rounded-lg border border-sand-200 bg-sand-50 px-4 py-3 text-base text-sage-800 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500/20"
                rows={3}
                value={(value.frequency_details?.notes as string) ?? ''}
                onChange={(e) =>
                  onChange({
                    frequency_details: {
                      ...value.frequency_details,
                      notes: e.target.value,
                    },
                  })
                }
              />
            </div>
          )}
        </>
      )}

      {preview && (
        <p className="rounded-lg bg-sage-50 px-4 py-3 text-sm text-sage-700">
          <span className="font-medium">Your schedule: </span>
          {preview}
        </p>
      )}
    </div>
  );
}

function buildStrengthPreview(value: DoseScheduleValue, unit: string): string {
  if (value.dose_amount === null) return '';

  const units = value.units_per_dose;
  const perAdmin = getTotalPerAdministration({
    dose_amount: value.dose_amount,
    units_per_dose: units,
  });

  if (units > 1) {
    return `${units} × ${value.dose_amount} ${unit} (${perAdmin} ${unit} each time)`;
  }

  return `${value.dose_amount} ${unit}`;
}

function buildDosePreview(value: DoseScheduleValue, unit: string): string {
  if (value.dose_amount === null || !value.frequency) return '';

  const units = value.units_per_dose;
  const perAdmin = getTotalPerAdministration({
    dose_amount: value.dose_amount,
    units_per_dose: units,
  });
  const timeOfDay = value.frequency_details?.time_of_day as string | undefined;
  const timePart = timeOfDay ? ` at ${formatTimeOfDay(timeOfDay)}` : '';

  let strength: string;
  if (units > 1) {
    strength = `${units} × ${value.dose_amount} ${unit}${timePart} (${perAdmin} ${unit} each time)`;
  } else {
    strength = `${value.dose_amount} ${unit}${timePart}`;
  }

  const freqLabel = FREQUENCY_LABELS[value.frequency] ?? value.frequency;
  return `${strength} · ${freqLabel}`;
}
