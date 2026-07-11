import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { Input } from '../ui/Input';
import { todayISO } from '../../utils/localDate';
import { Select } from '../ui/Select';
import { formatDateLong } from '../../utils/formatters';
import { getPelletReplacementDate } from '../../utils/medicationHelpers';

export function CombinationPelletFields() {
  const { formData, updateFormData } = useMedicationEntryStore();

  const replacementDate =
    formData.pellet_insertion_date && formData.pellet_expected_duration_months
      ? getPelletReplacementDate(
          formData.pellet_insertion_date,
          formData.pellet_expected_duration_months,
        )
      : null;

  return (
    <div className="space-y-4 rounded-xl border border-sand-200 bg-sand-50 p-4">
      <h3 className="font-medium text-sage-800">Combination pellet doses</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Estradiol dose (mg)"
          type="number"
          step="any"
          min="0"
          value={formData.dose_amount ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            updateFormData({ dose_amount: val, dose_unit: 'mg' });
          }}
        />
        <Input
          label="Testosterone dose (mg)"
          type="number"
          step="any"
          min="0"
          value={formData.secondary_dose_amount ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            updateFormData({ secondary_dose_amount: val, secondary_dose_unit: 'mg' });
          }}
        />
        <Input
          label="Progesterone dose (mg, optional)"
          type="number"
          step="any"
          min="0"
          value={formData.tertiary_dose_amount ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            updateFormData({ tertiary_dose_amount: val, tertiary_dose_unit: 'mg' });
          }}
        />
      </div>

      <Input
        label="Date of insertion"
        type="date"
        max={todayISO()}
        value={formData.pellet_insertion_date ?? formData.start_date}
        onChange={(e) => updateFormData({ pellet_insertion_date: e.target.value })}
      />

      <Select
        label="Expected duration"
        value={
          formData.pellet_expected_duration_months !== null
            ? String(formData.pellet_expected_duration_months)
            : ''
        }
        onChange={(e) =>
          updateFormData({ pellet_expected_duration_months: Number(e.target.value) })
        }
        placeholder="Select duration"
        options={[3, 4, 5, 6].map((m) => ({ value: String(m), label: `${m} months` }))}
      />

      {replacementDate && (
        <p className="text-sm text-sage-600">
          Next replacement expected around{' '}
          <strong>{formatDateLong(replacementDate)}</strong>
        </p>
      )}
    </div>
  );
}
