import { memo, useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import type { LabBiomarker } from '../../types/labs';
import {
  getValueStatus,
  getStatusBorderClass,
  getStatusDotClass,
  getTrendDirection,
  formatRangeLine,
  getRangeBarPosition,
  getOptimalSegment,
} from '../../utils/labHelpers';
import { LabRangeTooltip } from './LabRangeTooltip';
import { TrendArrow } from '../ui/TrendArrow';

interface LabValueInputProps {
  biomarker: LabBiomarker;
  value: number | null;
  previousValue: number | null;
  onChange: (biomarkerKey: string, value: number | null) => void;
}

function LabValueInputComponent({
  biomarker,
  value,
  previousValue,
  onChange,
}: LabValueInputProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [localText, setLocalText] = useState(value !== null ? String(value) : '');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    setLocalText(value !== null ? String(value) : '');
  }, [value]);

  const status = value !== null ? getValueStatus(value, biomarker) : null;
  const trend = value !== null ? getTrendDirection(value, previousValue) : null;
  const barPos = value !== null ? getRangeBarPosition(value, biomarker) : 0;
  const optimalSeg = getOptimalSegment(biomarker);

  const handleBlur = () => {
    const trimmed = localText.trim();
    if (trimmed === '') {
      onChange(biomarker.key, null);
      setWarning('');
      return;
    }
    const num = parseFloat(trimmed);
    if (!Number.isNaN(num) && num >= 0) {
      onChange(biomarker.key, num);
      const ceiling = (biomarker.conventionalRange?.max ?? Infinity) * 5;
      if (num > ceiling) {
        setWarning(`${num} ${biomarker.unit} seems unusually high — double-check?`);
      } else {
        setWarning('');
      }
    } else {
      setLocalText(value !== null ? String(value) : '');
    }
  };

  const handleChange = (text: string) => {
    setLocalText(text);
  };

  return (
    <div className="border-b border-sand-100 py-4 last:border-b-0">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-medium text-sage-800">{biomarker.label}</span>
        <button
          type="button"
          onClick={() => setShowTooltip(!showTooltip)}
          className="shrink-0 rounded p-1 text-sage-400 hover:bg-sage-50 hover:text-sage-600"
          aria-label={`Info about ${biomarker.label}`}
          aria-expanded={showTooltip}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      <LabRangeTooltip
        biomarker={biomarker}
        isOpen={showTooltip}
        onClose={() => setShowTooltip(false)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={localText}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className={[
              'w-28 rounded-lg border-2 bg-sand-50 px-3 py-2.5 text-base text-sage-800 outline-none focus:ring-2 focus:ring-sage-300',
              getStatusBorderClass(status),
            ].join(' ')}
            aria-label={`${biomarker.label} value`}
          />
          <span className="text-sm text-sage-500">{biomarker.unit}</span>
          {status && (
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotClass(status)}`}
              aria-hidden
            />
          )}
        </div>
        {value !== null && (
          <TrendArrow direction={trend} previousValue={previousValue} />
        )}
      </div>

      {value !== null && (
        <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-sand-100">
          {optimalSeg && (
            <div
              className="absolute top-0 h-full bg-success/30"
              style={{ left: `${optimalSeg.left}%`, width: `${optimalSeg.width}%` }}
            />
          )}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-on-accent bg-sage-600 shadow"
            style={{ left: `${barPos}%` }}
          />
        </div>
      )}

      <p className="mt-1.5 text-xs text-sage-400">{formatRangeLine(biomarker)}</p>
      {warning && (
        <p className="mt-1 text-xs text-warning">{warning}</p>
      )}
    </div>
  );
}

export const LabValueInput = memo(LabValueInputComponent);
