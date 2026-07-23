import { memo } from 'react';
import type { MRSScore } from '../../types/database';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';

interface WatchSymptomTapRowProps {
  symptomKey: string;
  label: string;
  value: MRSScore | null;
  onChange: (symptomKey: string, severity: MRSScore) => void;
}

const SCORES = [0, 1, 2, 3, 4] as MRSScore[];

function WatchSymptomTapRowComponent({
  symptomKey,
  label,
  value,
  onChange,
}: WatchSymptomTapRowProps) {
  return (
    <div className="rounded-xl border border-sand-200 bg-sand-50 p-3">
      <p className="mb-2 text-sm font-medium text-sage-800">{label}</p>
      <div className="flex gap-1">
        {SCORES.map((score) => {
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(symptomKey, score)}
              title={SEVERITY_LABELS[score]}
              className={[
                'min-h-[40px] flex-1 rounded-lg text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-sage-500 text-on-accent'
                  : 'bg-sand-100 text-sage-600 hover:bg-sand-200',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const WatchSymptomTapRow = memo(WatchSymptomTapRowComponent);
