import { useEffect } from 'react';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { Button } from '../ui/Button';

interface StepCheckinDayProps {
  onComplete: () => void;
  onBack: () => void;
}

const DAY_OPTIONS: Array<{ label: string; value: number }> = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export function StepCheckinDay({ onComplete, onBack }: StepCheckinDayProps) {
  const { formData, updateFormData, submitOnboarding, isSubmitting, error } =
    useOnboardingStore();

  useEffect(() => {
    if (formData.checkinDay === null) {
      // Convention: 0 = Sunday ... 6 = Saturday (matches JS Date#getDay()).
      updateFormData({ checkinDay: new Date().getDay() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = formData.checkinDay;
  const canContinue = selected !== null && selected !== undefined;

  const handleSubmit = async () => {
    const result = await submitOnboarding();
    if (result.success) onComplete();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Pick your weekly check-in day</h1>
        <p className="mt-3 text-sage-500">
          Your full check-in takes about two minutes, once a week. On the other days, a 10-second
          pulse and one-tap symptom logs keep your record alive. Which day suits you?
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DAY_OPTIONS.map((d) => {
          const isSelected = selected === d.value;
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => updateFormData({ checkinDay: d.value })}
              className={[
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                isSelected
                  ? 'border-sage-600 bg-sage-50 text-sage-800 ring-2 ring-sage-500/20'
                  : 'border-sand-200 bg-white text-sage-600 hover:border-sage-300 hover:bg-sage-50/50',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              {d.label}
            </button>
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
          disabled={!canContinue}
          isLoading={isSubmitting}
          loadingText="Saving..."
          onClick={handleSubmit}
          className="flex-1"
        >
          Complete Setup
        </Button>
      </div>
    </div>
  );
}

