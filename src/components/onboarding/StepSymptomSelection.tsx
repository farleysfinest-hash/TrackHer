import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { SYMPTOM_CATALOG } from '../../data/symptoms';
import {
  SYMPTOM_BODY_SYSTEM_LABELS,
  type SymptomBodySystem,
} from '../../types/symptoms';
import type { StrawStageCode } from '../../lib/strawStaging';
import { SymptomChip } from './SymptomChip';
import { Button } from '../ui/Button';

interface StepSymptomSelectionProps {
  onNext: () => void;
  onBack: () => void;
}

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
    submitSymptomSelections,
    isSubmitting,
    error,
  } = useOnboardingStore();

  const stage = formData.stagingResult?.strawStage ?? null;
  const groups = groupSymptomsByBodySystem(stage);
  const [collapsedOther, setCollapsedOther] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BODY_SYSTEM_ORDER.map((s) => [s, true])),
  );

  const selectedSymptoms = formData.selectedSymptoms;
  const watchSymptoms = formData.watchSymptoms;
  const watchCount = watchSymptoms.length;
  const canContinue =
    selectedSymptoms.length > 0 && watchCount >= 1 && watchCount <= 5;

  const selectedDefs = SYMPTOM_CATALOG.filter((s) => selectedSymptoms.includes(s.key));

  const handleContinue = async () => {
    const result = await submitSymptomSelections();
    if (result.success) onNext();
  };

  const toggleOtherSection = (system: string) => {
    setCollapsedOther((prev) => ({ ...prev, [system]: !prev[system] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Your symptoms</h1>
        <p className="mt-3 text-sage-500">
          Choose the symptoms you&apos;d like to track beyond the core check-in. We&apos;ve
          highlighted ones common for your stage.
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

              {common.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-sage-500">
                    Common for your stage
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {common.map((s) => (
                      <SymptomChip
                        key={s.key}
                        label={s.label}
                        checked={selectedSymptoms.includes(s.key)}
                        onToggle={() => toggleSymptom(s.key)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {other.length > 0 && (
                <div className={common.length > 0 ? 'mt-4' : 'mt-3'}>
                  <button
                    type="button"
                    onClick={() => toggleOtherSection(system)}
                    className="flex w-full items-center justify-between text-xs font-medium text-sage-500"
                  >
                    <span>Other symptoms ({other.length})</span>
                    {collapsedOther[system] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>
                  {!collapsedOther[system] && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {other.map((s) => (
                        <SymptomChip
                          key={s.key}
                          label={s.label}
                          checked={selectedSymptoms.includes(s.key)}
                          onToggle={() => toggleSymptom(s.key)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-sand-200 bg-sage-50/50 p-5">
        <h3 className="font-display text-lg text-sage-800">Your watch symptoms</h3>
        <p className="mt-2 text-sm text-sage-500">
          Which symptoms bother you the most? Pick 3–5 that you&apos;d like to quick-log
          anytime during the day.
        </p>
        <p className="mt-2 text-sm font-medium text-sage-600">
          {watchCount} of 5 selected
        </p>

        {selectedDefs.length === 0 ? (
          <p className="mt-3 text-sm text-sage-400">
            Select symptoms above to choose your watch list.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDefs.map((s) => {
              const isWatch = watchSymptoms.includes(s.key);
              const atMax = watchCount >= 5 && !isWatch;
              return (
                <SymptomChip
                  key={s.key}
                  label={s.label}
                  checked={isWatch}
                  watchSelected={isWatch}
                  variant="watch"
                  disabled={atMax}
                  onToggle={() => toggleWatchSymptom(s.key)}
                />
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          Back
        </Button>
        <Button
          disabled={!canContinue}
          isLoading={isSubmitting}
          loadingText="Saving..."
          onClick={handleContinue}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
