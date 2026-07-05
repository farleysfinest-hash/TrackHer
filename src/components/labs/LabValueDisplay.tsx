import { getBiomarkerByKey } from '../../data/labRanges';
import {
  getValueStatus,
  getStatusDotClass,
  getTrendDirection,
  formatRangeLine,
  getRangeBarPosition,
  getOptimalSegment,
} from '../../utils/labHelpers';
import { TrendArrow } from '../ui/TrendArrow';

interface LabValueDisplayProps {
  biomarkerKey: string;
  value: number;
  previousValue?: number | null;
  compact?: boolean;
}

export function LabValueDisplay({
  biomarkerKey,
  value,
  previousValue = null,
  compact = false,
}: LabValueDisplayProps) {
  const biomarker = getBiomarkerByKey(biomarkerKey);
  if (!biomarker) return null;

  const status = getValueStatus(value, biomarker);
  const trend = getTrendDirection(value, previousValue ?? null);
  const barPos = getRangeBarPosition(value, biomarker);
  const optimalSeg = getOptimalSegment(biomarker);

  return (
    <div className={compact ? 'text-sm' : ''}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-sage-800">{biomarker.label}</span>
        <span className="text-sage-700">
          {value} {biomarker.unit}
        </span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${getStatusDotClass(status)}`} />
        <TrendArrow direction={trend} previousValue={previousValue} />
      </div>

      {!compact && (
        <>
          <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-sand-100">
            {optimalSeg && (
              <div
                className="absolute top-0 h-full bg-success/30"
                style={{ left: `${optimalSeg.left}%`, width: `${optimalSeg.width}%` }}
              />
            )}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sage-600 shadow"
              style={{ left: `${barPos}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-sage-400">{formatRangeLine(biomarker)}</p>
        </>
      )}
    </div>
  );
}
