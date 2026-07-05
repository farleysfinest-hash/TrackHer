import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { formatDateLong } from '../../utils/formatters';

interface PelletFieldsProps {
  insertionDate: string;
  durationMonths: number | null;
  durationOptions: number[];
  replacementDate: Date | null;
  onInsertionDateChange: (date: string) => void;
  onDurationChange: (months: number) => void;
}

export function PelletFields({
  insertionDate,
  durationMonths,
  durationOptions,
  replacementDate,
  onInsertionDateChange,
  onDurationChange,
}: PelletFieldsProps) {
  return (
    <div className="space-y-4 rounded-xl border border-sand-200 bg-sand-50 p-4">
      <h3 className="font-medium text-sage-800">Pellet details</h3>

      <Input
        label="Date of insertion"
        type="date"
        max={new Date().toISOString().split('T')[0]}
        value={insertionDate}
        onChange={(e) => onInsertionDateChange(e.target.value)}
      />

      <Select
        label="Expected duration"
        value={durationMonths !== null ? String(durationMonths) : ''}
        onChange={(e) => onDurationChange(Number(e.target.value))}
        placeholder="Select duration"
        options={durationOptions.map((m) => ({
          value: String(m),
          label: `${m} months`,
        }))}
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
