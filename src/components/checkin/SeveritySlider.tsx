import { memo, useState, type KeyboardEvent } from 'react';
import { Info } from 'lucide-react';
import type { MRSScore } from '../../types/database';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';

interface SeveritySliderProps {
  symptomKey: string;
  label: string;
  description?: string;
  value: MRSScore | null;
  onChange: (value: MRSScore) => void;
}

const SELECTED_STYLES: Record<MRSScore, string> = {
  0: 'bg-sage-100 text-sage-700 border-sage-300 z-10',
  1: 'bg-sage-200 text-sage-800 border-sage-400 z-10',
  2: 'bg-amber-100 text-amber-800 border-amber-300 z-10',
  3: 'bg-orange-100 text-orange-800 border-orange-300 z-10',
  4: 'bg-red-100 text-red-800 border-red-300 z-10',
};

function SeveritySliderComponent({
  symptomKey,
  label,
  description,
  value,
  onChange,
}: SeveritySliderProps) {
  const [showDesc, setShowDesc] = useState(false);
  const descId = `${symptomKey}-desc`;
  const scores = [0, 1, 2, 3, 4] as MRSScore[];

  const handleKeyDown = (e: KeyboardEvent, current: MRSScore | null) => {
    const idx = current === null ? -1 : scores.indexOf(current);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = scores[Math.min(idx + 1, scores.length - 1)];
      onChange(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = scores[Math.max(idx - 1, 0)];
      onChange(next);
    }
  };

  return (
    <div className="border-b border-sand-100 py-4 last:border-b-0">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="font-medium text-sage-800">{label}</span>
        {description && (
          <button
            type="button"
            onClick={() => setShowDesc(!showDesc)}
            className="shrink-0 rounded p-1 text-sage-400 hover:bg-sage-50 hover:text-sage-600"
            aria-label={`Info about ${label}`}
            aria-expanded={showDesc}
            aria-controls={descId}
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDesc && description && (
        <p id={descId} className="mb-3 text-sm text-sage-500">
          {description}
        </p>
      )}

      <div
        role="radiogroup"
        aria-label={`${label} severity`}
        aria-describedby={description ? descId : undefined}
        className="flex overflow-hidden rounded-lg border border-sand-200"
        onKeyDown={(e) => handleKeyDown(e, value)}
      >
        {([0, 1, 2, 3, 4] as MRSScore[]).map((score) => {
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${label} severity: ${SEVERITY_LABELS[score]}`}
              onClick={() => onChange(score)}
              className={[
                'min-h-[44px] flex-1 border-r border-sand-200 text-sm font-medium transition-colors last:border-r-0',
                isSelected
                  ? SELECTED_STYLES[score]
                  : 'bg-sand-100 text-sage-600 hover:bg-sand-200',
              ].join(' ')}
            >
              {score}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-center text-xs text-sage-400">
        None · Mild · Moderate · Severe · Very Severe
      </p>
    </div>
  );
}

export const SeveritySlider = memo(SeveritySliderComponent);
