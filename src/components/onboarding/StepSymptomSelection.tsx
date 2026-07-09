import { useState } from 'react';
import { Star } from 'lucide-react';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { SYMPTOM_CATALOG } from '../../data/symptoms';
import {
  SYMPTOM_BODY_SYSTEM_LABELS,
  type SymptomBodySystem,
} from '../../types/symptoms';
import type { StrawStageCode } from '../../lib/strawStaging';
import { UROGENITAL_NORMALIZATION_COPY } from '../../utils/echoHelpers';
import { SymptomChip } from './SymptomChip';
import { Button } from '../ui/Button';

interface StepSymptomSelectionProps {
  onNext: () => void;
  onBack: () => void;
}

const MAX_SYMPTOMS = 8;
const MAX_WATCH = 5;

const BODY_SYSTEM_ORDER: SymptomBodySystem[] = [
  'vasomotor',
  'mood',
  'cognitive',
  'sleep',
  'musculoskeletal',
  'energy',
  'cardiovascular',
  'genitourinary',
  'digestive',
  'skin_hair_nails',
  'neurological',
  'other',
];

function groupSymptomsByBodySystem(stage: StrawStageCode | null) {
  const extended = SYMPTOM_CATALOG.filter((s) => !s.isMRSCore);
  const groups = new Map<SymptomBodySystem, { common: typeof extended; other: typeof extended }>();

  for (const system of BODY_SYSTEM_ORDER) {
    groups.set(system, { common: [], other: [] });
  }

  for (const symptom of extended) {
    const group = groups.get(symptom.bodySystem)!;
    const isCommon = stage ? symptom.phasePeak.includes(stage) : false;
    if (isCommon) {
      group.common.push(symptom);
    } else {
      group.other.push(symptom);
    }
  }

  return groups;
}

export function StepSymptomSelection({ onNext, onBack }: StepSymptomSelectionProps) {
  const {
    formData,
    toggleSymptom,
    toggleWatchSymptom,
    initWatchSymptomsFromSelection,
    submitSymptomSelections,
    isSubmitting,
    error,
  } = useOnboardingStore();

  const [phase, setPhase] = useState<'select' | 'star'>('select');
  const [collapsedOther, setCollapsedOther] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BODY_SYSTEM_ORDER.map((s) => [s, true])),
  );

  const stage = formData.stagingResult?.strawStage ?? null;
  const groups = groupSymptomsByBodySystem(stage);
  const selectedSymptoms = formData.selectedSymptoms;
  const watchSymptoms = formData.watchSymptoms;
  const selectedCount = selectedSymptoms.length;
  const watchCount = watchSymptoms.length;
  const atMax = selectedCount >= MAX_SYMPTOMS;
  const canContinueSelect = selectedCount >= 1;
  const canContinueStar = watchCount >= 1 && watchCount <= MAX_WATCH;

  const handleContinueSelect = () => {
    initWatchSymptomsFromSelection();
    setPhase('star');
  };

  const handleContinueStar = async () => {
    const result = await submitSymptomSelections();
    if (result.success) onNext();
  };

  const handleBack = () => {
    if (phase === 'star') {
      setPhase('select');
      return;
    }
    onBack();
  };

  if (phase === 'star') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl text-sage-800">Which of these hit you hardest?</h1>
          <p className="mt-3 text-sage-500">
            Star up to 5 — they become one-tap quick logs on your dashboard.
          </p>
          <p className="mt-2 text-sm font-medium text-sage-600">
            {watchCount} of {MAX_WATCH} starred
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {selectedSymptoms.map((key) => {
            const def = SYMPTOM_CATALOG.find((s) => s.key === key);
            if (!def) return null;
            const isStarred = watchSymptoms.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleWatchSymptom(key)}
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-5 py-3 text-base font-medium transition-colors',
                  isStarred
                    ? 'border-sage-600 bg-sage-600 text-white'
                    : 'border-sand-200 bg-white text-sage-600 hover:border-sage-300',
                ].join(' ')}
              >
                <Star
                  className={['h-4 w-4', isStarred ? 'fill-current' : ''].join(' ')}
                  aria-hidden
                />
                {def.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleBack} className="flex-1" disabled={isSubmitting}>
            Back
          </Button>
          <Button
            disabled={!canContinueStar}
            isLoading={isSubmitting}
            loadingText="Saving..."
            onClick={() => void handleContinueStar()}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Which symptoms bother you most?</h1>
        <p className="mt-3 text-sage-500">
          Pick up to 8. You&apos;ll rate these in your check-ins.
        </p>
        <p className="mt-2 text-sm font-medium text-sage-600">
          {selectedCount} of {MAX_SYMPTOMS} selected
        </p>
      </div>

      <div className="space-y-4">
        {BODY_SYSTEM_ORDER.map((system) => {
          const { common, other } = groups.get(system)!;
          if (common.length === 0 && other.length === 0) return null;

          return (
            <div key={system} className="rounded-xl border border-sand-200 bg-white p-4">
              <h3 className="font-display text-base text-sage-800">
                {SYMPTOM_BODY_SYSTEM_LABELS[system]}
              </h3>
              {system === 'genitourinary' && (
                <p className="mt-1 text-xs leading-relaxed text-sage-400">
                  {UROGENITAL_NORMALIZATION_COPY}
                </p>
              )}

              {common.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-sage-500">
                    Common for your stage
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {common.map((s) => {
                      const isSelected = selectedSymptoms.includes(s.key);
                      return (
                        <SymptomChip
                          key={s.key}
                          label={s.label}
                          checked={isSelected}
                          disabled={atMax && !isSelected}
                          onToggle={() => toggleSymptom(s.key)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {other.length > 0 && (
                <div className={common.length > 0 ? 'mt-4' : 'mt-3'}>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedOther((prev) => ({ ...prev, [system]: !prev[system] }))
                    }
                    className="flex w-full items-center justify-between text-xs font-medium text-sage-500"
                  >
                    <span>Show more ({other.length})</span>
                    <span>{collapsedOther[system] ? '▼' : '▲'}</span>
                  </button>
                  {!collapsedOther[system] && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {other.map((s) => {
                        const isSelected = selectedSymptoms.includes(s.key);
                        return (
                          <SymptomChip
                            key={s.key}
                            label={s.label}
                            checked={isSelected}
                            disabled={atMax && !isSelected}
                            onToggle={() => toggleSymptom(s.key)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          Back
        </Button>
        <Button
          disabled={!canContinueSelect}
          onClick={handleContinueSelect}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
