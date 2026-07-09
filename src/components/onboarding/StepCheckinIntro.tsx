import { useState } from 'react';
import type { MRSScore } from '../../types/database';
import { SeveritySlider } from '../checkin/SeveritySlider';
import { Button } from '../ui/Button';

interface StepCheckinIntroProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepCheckinIntro({ onNext, onBack }: StepCheckinIntroProps) {
  const [practiceScore, setPracticeScore] = useState<MRSScore | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">How check-ins work</h1>
        <p className="mt-3 text-sage-500">
          A check-in takes about two minutes. You&apos;ll rate 11 symptoms on a simple 0–4 scale
          using the Menopause Rating Scale (MRS) — a clinically validated questionnaire used
          worldwide. Your scores build a record your provider will actually recognize.
        </p>
      </div>

      <div className="rounded-xl border border-sand-200 bg-white px-4">
        <SeveritySlider
          symptomKey="practice_hot_flashes"
          label="Hot flashes, sweating"
          value={practiceScore}
          onChange={(_key, value) => setPracticeScore(value)}
        />
        <p className="pb-4 text-center text-sm text-sage-500">
          Try it — 0 means none, 4 means very severe. This one&apos;s just practice.
        </p>
      </div>

      <p className="text-sm text-sage-500">
        Rate only what you experience. Leaving a symptom at &ldquo;none&rdquo; is real data too.
      </p>

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
