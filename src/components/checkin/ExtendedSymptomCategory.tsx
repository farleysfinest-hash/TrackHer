import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SymptomDefinition } from '../../types/symptoms';
import type { SymptomSeverity } from '../../types/database';
import { useCheckinStore } from '../../stores/checkinStore';

interface ExtendedSymptomCategoryProps {
  label: string;
  symptoms: SymptomDefinition[];
  defaultExpanded?: boolean;
}

const SEVERITY_OPTIONS: { value: SymptomSeverity; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

export function ExtendedSymptomCategory({
  label,
  symptoms,
  defaultExpanded = false,
}: ExtendedSymptomCategoryProps) {
  const extendedSymptoms = useCheckinStore((s) => s.extendedSymptoms);
  const toggleExtendedSymptom = useCheckinStore((s) => s.toggleExtendedSymptom);
  const setExtendedSeverity = useCheckinStore((s) => s.setExtendedSeverity);
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
                    onChange={() => toggleExtendedSymptom(symptom.key)}
                    className="mt-1 rounded border-sand-300 text-sage-500 focus:ring-sage-500"
                  />
                  <span className="text-sm text-sage-800">{symptom.label}</span>
                </label>

                {isChecked && entry && (
                  <div className="ml-7 mt-2 flex gap-2">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setExtendedSeverity(symptom.key, opt.value)}
                        className={[
                          'min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-medium',
                          entry.severity === opt.value
                            ? 'bg-sage-500 text-white'
                            : 'bg-sand-100 text-sage-600 hover:bg-sand-200',
                        ].join(' ')}
                      >
                        {opt.label}
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
