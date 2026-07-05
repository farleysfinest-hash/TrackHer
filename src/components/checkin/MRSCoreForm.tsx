import { useState } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useAuthStore } from '../../stores/authStore';
import { MRS_CORE_SYMPTOMS } from '../../data/symptoms';
import { getTimeframeLabel, countRatedMRS, type MRSSymptomKey } from '../../utils/checkinHelpers';
import { SeveritySlider } from './SeveritySlider';
import { Button } from '../ui/Button';

interface MRSCoreFormProps {
  onNext: () => void;
  onBack: () => void;
}

export function MRSCoreForm({ onNext, onBack }: MRSCoreFormProps) {
  const { mrsScores, setMRSScore } = useCheckinStore();
  const frequency = useAuthStore((s) => s.profile?.checkin_frequency);
  const [dismissedNudge, setDismissedNudge] = useState(false);

  const ratedCount = countRatedMRS(mrsScores);
  const showNudge = ratedCount < 8 && !dismissedNudge;

  const orderedSymptoms = [...MRS_CORE_SYMPTOMS].sort(
    (a, b) => (a.mrsIndex ?? 0) - (b.mrsIndex ?? 0),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">Rate your symptoms</h2>
        <p className="mt-2 text-sage-500">{getTimeframeLabel(frequency)}</p>
      </div>

      <div className="rounded-xl border border-sand-200 bg-white px-4">
        {orderedSymptoms.map((symptom) => (
          <SeveritySlider
            key={symptom.key}
            symptomKey={symptom.key}
            label={symptom.label}
            description={symptom.description}
            value={mrsScores[symptom.key as MRSSymptomKey]}
            onChange={(score) => setMRSScore(symptom.key as MRSSymptomKey, score)}
          />
        ))}
      </div>

      {showNudge && (
        <div className="rounded-lg bg-sage-50 p-4 text-sm text-sage-600">
          You&apos;ve rated {ratedCount} of 16 symptoms. The more you rate, the better we can
          track patterns.{' '}
          <button
            type="button"
            onClick={() => setDismissedNudge(true)}
            className="font-medium text-sage-700 underline"
          >
            Continue anyway
          </button>
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
