import { getBiomarkerByKey } from '../../data/labRanges';
import {
  getValueStatus,
  getStatusDotClass,
  getTrendDirection,
  formatRangeLine,
  getRangeBarPosition,
} from '../../utils/labHelpers';
import type { LabBiomarker, LabReportedValue } from '../../types/labs';
import { TrendArrow } from '../ui/TrendArrow';

const CATEGORY_COLORS: Record<LabBiomarker['category'], string> = {
  core_hrt: 'var(--color-sage-500)',
  thyroid: '#6B8E7B',
  metabolic: '#8B7355',
  lipid: '#7B6B8E',
};

interface LabValueDisplayProps {
  biomarkerKey: string;
  value: number;
  previousValue?: number | null;
  compact?: boolean;
  reportedValue?: LabReportedValue | null;
}

export function LabValueDisplay({
  biomarkerKey,
  value,
  previousValue = null,
  compact = false,
  reportedValue = null,
}: LabValueDisplayProps) {
  const biomarker = getBiomarkerByKey(biomarkerKey);
  if (!biomarker) return null;

  const status = reportedValue?.reportedFlag === 'normal'
    ? 'conventional'
    : reportedValue?.reportedFlag === 'low' || reportedValue?.reportedFlag === 'high' || reportedValue?.reportedFlag === 'abnormal'
      ? 'out_of_range'
      : getValueStatus(value, biomarker);
  const trend = getTrendDirection(value, previousValue ?? null);
  const barPos = getRangeBarPosition(value, biomarker);
  const visibleValue = reportedValue
    ? `${reportedValue.comparator ?? ''}${reportedValue.reportedValue} ${reportedValue.reportedUnit ?? ''}`.trim()
    : `${value} ${biomarker.unit}`;

  return (
    <div className={compact ? 'text-sm' : ''}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: CATEGORY_COLORS[biomarker.category] ?? 'var(--color-sage-400)' }}
        />
        <span className="font-medium text-sage-800">{biomarker.label}</span>
        {/* Selectable on purpose: lab values get copied into notes and messages
            to providers. Selection is blocked app-wide in index.css. */}
        <span className="select-text text-sage-700">
          {visibleValue}
        </span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${getStatusDotClass(status)}`} />
        <TrendArrow direction={trend} previousValue={previousValue} />
      </div>

      {!compact && (
        <>
          {biomarker.referenceSource && (
          <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-sand-100">
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-on-accent bg-sage-600 shadow"
              style={{ left: `${barPos}%` }}
            />
          </div>
          )}
          <p className="mt-1 text-xs leading-relaxed text-sage-500">
            {reportedValue?.referenceText
              ? `This laboratory’s reference interval: ${reportedValue.referenceText}${reportedValue.reportedUnit ? ` ${reportedValue.reportedUnit}` : ''}`
              : formatRangeLine(biomarker)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sage-400">
            A reference interval is a comparison guide, not a personal treatment target.
          </p>
        </>
      )}
    </div>
  );
}
