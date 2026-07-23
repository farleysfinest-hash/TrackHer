import { useMemo, useState } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { SYMPTOM_CATALOG, getExtendedByCategory } from '../../data/symptoms';
import type { SymptomCategory } from '../../types/symptoms';
import type { MRSScore } from '../../types/database';
import { CATEGORY_LABELS, SEVERITY_LABELS } from '../../utils/checkinHelpers';
import { ExtendedSymptomCategory } from './ExtendedSymptomCategory';
import { SymptomSearchBar } from './SymptomSearchBar';
import { Button } from '../ui/Button';

interface ExtendedSymptomsFormProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const CATEGORIES: SymptomCategory[] = [
  'body',
  'digestive',
  'mind',
  'sexual_pelvic',
  'skin_hair',
];

const SCORES = [0, 1, 2, 3, 4] as MRSScore[];

export function ExtendedSymptomsForm({ onNext, onBack, onSkip }: ExtendedSymptomsFormProps) {
  const extendedSymptoms = useCheckinStore((s) => s.extendedSymptoms);
  const setExtendedScore = useCheckinStore((s) => s.setExtendedScore);
  const removeExtendedSymptom = useCheckinStore((s) => s.removeExtendedSymptom);
  const [search, setSearch] = useState('');

  const filteredSymptoms = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return SYMPTOM_CATALOG.filter(
      (s) => !s.isMRSCore && s.label.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-sage-800">Additional symptoms (optional)</h2>
          <p className="mt-2 text-sage-500">
            Check any additional symptoms you&apos;ve been experiencing. These help build a more
            complete picture.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip this step
        </Button>
      </div>

      <SymptomSearchBar value={search} onChange={setSearch} />

      {filteredSymptoms ? (
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-4">
          {filteredSymptoms.length === 0 ? (
            <p className="text-sm text-sage-400">No symptoms match your search.</p>
          ) : (
            filteredSymptoms.map((symptom) => {
              const entry = extendedSymptoms.find((s) => s.symptom_key === symptom.key);
              return (
                <div key={symptom.key} className="border-b border-sand-100 py-3 last:border-0">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!entry}
                      onChange={() =>
                        entry
                          ? removeExtendedSymptom(symptom.key)
                          : setExtendedScore(symptom.key, 0)
                      }
                      className="rounded border-sand-300 text-sage-500"
                    />
                    <span className="text-sm text-sage-800">{symptom.label}</span>
                  </label>
                  {entry && (
                    <div className="ml-7 mt-2 flex gap-1">
                      {SCORES.map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setExtendedScore(symptom.key, sev)}
                          title={SEVERITY_LABELS[sev]}
                          className={[
                            'rounded-lg px-2 py-1 text-xs',
                            entry.severity === sev
                              ? 'bg-sage-500 text-on-accent'
                              : 'bg-sand-100 text-sage-600',
                          ].join(' ')}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {CATEGORIES.map((cat, i) => (
            <ExtendedSymptomCategory
              key={cat}
              label={CATEGORY_LABELS[cat] ?? cat}
              symptoms={getExtendedByCategory(cat)}
              defaultExpanded={i === 0}
            />
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
