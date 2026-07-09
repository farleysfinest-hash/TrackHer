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

const MAX_SYMPTOMS = 8;

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
  const { formData, toggleSymptom, submitSymptomSelections, isSubmitting, error } =
    useOnboardingStore();

  const stage = formData.stagingResult?.strawStage ?? null;
  const groups = groupSymptomsByBodySystem(stage);
  const [collapsedOther, setCollapsedOther] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BODY_SYSTEM_ORDER.map((s) => [s, true])),
  );

  const selectedSymptoms = formData.selectedSymptoms;
  const selectedCount = selectedSymptoms.length;
  const atMax = selectedCount >= MAX_SYMPTOMS;
  const canContinue = selectedCount >= 1;

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
        <h1 className="font-display text-3xl text-sage-800">Which symptoms bother you most?</h1>
        <p className="mt-3 text-sage-500">
          Pick up to 8. You&apos;ll rate these in your check-ins, and your top picks become
          one-tap quick logs.
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
                    onClick={() => toggleOtherSection(system)}
                    className="flex w-full items-center justify-between text-xs font-medium text-sage-500"
                  >
                    <span>Show more ({other.length})</span>
                    {collapsedOther[system] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
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

      <p className="text-sm text-sage-400">
        Your first 5 picks will appear as quick-log buttons on your dashboard. You can change
        all of this later in check-in settings.
      </p>

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
