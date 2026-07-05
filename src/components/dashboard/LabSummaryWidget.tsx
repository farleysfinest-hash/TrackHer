import { Link } from 'react-router-dom';
import type { LabResult } from '../../types/database';
import { getBiomarkerByKey } from '../../data/labRanges';
import {
  getDisplayBiomarkers,
  getValueStatus,
  getStatusDotClass,
  getNextLabsMessage,
} from '../../utils/labHelpers';
import { formatDateLong } from '../../utils/formatters';
import { Card } from '../ui/Card';

interface LabSummaryWidgetProps {
  labResults: LabResult[];
}

export function LabSummaryWidget({ labResults }: LabSummaryWidgetProps) {
  const latest = labResults[0] ?? null;

  if (!latest) {
    return (
      <Card variant="elevated">
        <h2 className="font-display text-lg text-sage-800">Lab Results</h2>
        <p className="mt-2 text-sm text-sage-500">{getNextLabsMessage(null)}</p>
        <Link
          to="/labs"
          className="mt-4 inline-block text-sm font-medium text-sage-600 hover:text-sage-800"
        >
          Add lab results →
        </Link>
      </Card>
    );
  }

  const display = getDisplayBiomarkers(latest, 4);

  return (
    <Card variant="elevated">
      <h2 className="font-display text-lg text-sage-800">Latest Lab Results</h2>
      <p className="mt-1 text-sm text-sage-500">{formatDateLong(latest.draw_date)}</p>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sage-700">
        {display.map(({ key, value }) => {
          const biomarker = getBiomarkerByKey(key);
          if (!biomarker) return null;
          const status = getValueStatus(value, biomarker);
          const shortLabel =
            key === 'estradiol'
              ? 'E2'
              : key === 'progesterone'
                ? 'Prog'
                : key === 'total_testosterone'
                  ? 'Total T'
                  : biomarker.label.split(' ')[0];
          return (
            <li key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getStatusDotClass(status)}`} />
              {shortLabel}: {value} {biomarker.unit}
            </li>
          );
        })}
      </ul>

      <Link
        to="/labs"
        className="mt-4 inline-block text-sm font-medium text-sage-600 hover:text-sage-800"
      >
        View Full Results →
      </Link>

      <p className="mt-3 text-xs text-sage-400">{getNextLabsMessage(latest.draw_date)}</p>
    </Card>
  );
}
