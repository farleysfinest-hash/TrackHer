import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SymptomDefinition } from '../../types/symptoms';
import type { MRSScore } from '../../types/database';
import { useCheckinStore } from '../../stores/checkinStore';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';

interface ExtendedSymptomCategoryProps {
  label: string;
  symptoms: SymptomDefinition[];
  defaultExpanded?: boolean;
}

const SCORES = [0, 1, 2, 3, 4] as MRSScore[];

export function ExtendedSymptomCategory({
  label,
  symptoms,
  defaultExpanded = false,
}: ExtendedSymptomCategoryProps) {
  const extendedSymptoms = useCheckinStore((s) => s.extendedSymptoms);
  const setExtendedScore = useCheckinStore((s) => s.setExtendedScore);
  const removeExtendedSymptom = useCheckinStore((s) => s.removeExtendedSymptom);
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (symptoms.length === 0) return null;

  return (
    <div className="rounded-xl border border-sand-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-sage-800">
          {label} ({symptoms.length} symptoms)
        </span>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-sage-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-sage-400" />
        )}
      </button>

      {expanded && (
        <div className="space-y-1 border-t border-sand-100 px-4 py-2">
          {symptoms.map((symptom) => {
            const entry = extendedSymptoms.find((s) => s.symptom_key === symptom.key);
            const isChecked = !!entry;

            return (
              <div key={symptom.key} className="py-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() =>
                      isChecked
                        ? removeExtendedSymptom(symptom.key)
                        : setExtendedScore(symptom.key, 0)
                    }
                    className="mt-1 rounded border-sand-300 text-sage-500 focus:ring-sage-500"
                  />
                  <span className="text-sm text-sage-800">{symptom.label}</span>
                </label>

                {isChecked && entry && (
                  <div className="ml-7 mt-2 flex gap-1">
                    {SCORES.map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setExtendedScore(symptom.key, score)}
                        title={SEVERITY_LABELS[score]}
                        className={[
                          'min-h-[36px] flex-1 rounded-lg text-xs font-medium',
                          entry.severity === score
                            ? 'bg-sage-500 text-white'
                            : 'bg-sand-100 text-sage-600 hover:bg-sand-200',
                        ].join(' ')}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
