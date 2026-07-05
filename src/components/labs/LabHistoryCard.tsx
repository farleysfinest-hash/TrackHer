import { getBiomarkerByKey, LAB_BIOMARKERS } from '../../data/labRanges';
import type { LabResult } from '../../types/database';
import { formatDateLong } from '../../utils/formatters';
import {
  countFilledLab,
  getDisplayBiomarkers,
  getValueStatus,
  getStatusDotClass,
} from '../../utils/labHelpers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface LabHistoryCardProps {
  lab: LabResult;
  onViewDetails: (lab: LabResult) => void;
}

export function LabHistoryCard({ lab, onViewDetails }: LabHistoryCardProps) {
  const display = getDisplayBiomarkers(lab, 6);
  const totalFilled = countFilledLab(lab);
  const remaining = totalFilled - display.length;

  const drawDetails = [
    lab.fasting === true ? 'Fasting' : lab.fasting === false ? 'Non-fasting' : null,
    lab.draw_time ? lab.draw_time : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card variant="outlined" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-sage-800">{formatDateLong(lab.draw_date)}</h3>
          {lab.lab_name && <p className="text-sm text-sage-500">{lab.lab_name}</p>}
          {drawDetails && <p className="mt-0.5 text-xs text-sage-400">{drawDetails}</p>}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {display.map(({ key, value }) => {
          const biomarker = getBiomarkerByKey(key);
          if (!biomarker) return null;
          const status = getValueStatus(value, biomarker);
          return (
            <li key={key} className="flex items-center gap-2 text-sm text-sage-700">
              <span className={`h-2 w-2 shrink-0 rounded-full ${getStatusDotClass(status)}`} />
              <span>
                {biomarker.label.split(' ')[0]}: {value} {biomarker.unit}
              </span>
            </li>
          );
        })}
        {remaining > 0 && (
          <li className="text-sm text-sage-400">and {remaining} more</li>
        )}
      </ul>

      <p className="mt-3 text-xs text-sage-400">
        {totalFilled} of {LAB_BIOMARKERS.length} biomarkers entered
      </p>

      <Button variant="secondary" size="sm" className="mt-4" onClick={() => onViewDetails(lab)}>
        View Full Results
      </Button>
    </Card>
  );
}
