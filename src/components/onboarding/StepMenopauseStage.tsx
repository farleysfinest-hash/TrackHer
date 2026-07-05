import { useOnboardingStore } from '../../stores/onboardingStore';
import { MENOPAUSE_STAGES } from '../../lib/constants';
import type { MenopauseStage } from '../../types/database';
import { Button } from '../ui/Button';
import { RadioGroup } from '../ui/RadioGroup';
import { Input } from '../ui/Input';
import { Info } from 'lucide-react';

interface StepMenopauseStageProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepMenopauseStage({ onNext, onBack }: StepMenopauseStageProps) {
  const { formData, updateFormData } = useOnboardingStore();

  const canContinue = formData.menopauseStage !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Where are you in your journey?</h1>
        <p className="mt-3 text-sage-500">
          Select the stage that best describes where you are today.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-sage-50 p-3 text-sm text-sage-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sage-400" />
        <span>
          Understanding your stage helps us customize which symptoms and patterns to watch for.
        </span>
      </div>

      <RadioGroup
        name="menopause-stage"
        options={MENOPAUSE_STAGES.map((s) => ({
          value: s.value,
          label: s.label,
          description: s.description,
        }))}
        value={formData.menopauseStage ?? ''}
        onChange={(value) => updateFormData({ menopauseStage: value as MenopauseStage })}
      />

      {formData.menopauseStage === 'perimenopause' && (
        <Input
          label="Date of last period (optional)"
          type="date"
          value={formData.lastPeriodDate}
          onChange={(e) => updateFormData({ lastPeriodDate: e.target.value })}
        />
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button disabled={!canContinue} onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}
