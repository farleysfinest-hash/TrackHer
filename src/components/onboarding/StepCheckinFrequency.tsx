import { CalendarCheck, CalendarDays, CalendarRange } from 'lucide-react';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { CHECKIN_FREQUENCIES } from '../../lib/constants';
import type { CheckinFrequency } from '../../types/database';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface StepCheckinFrequencyProps {
  onComplete: () => void;
  onBack: () => void;
}

const frequencyIcons = {
  daily: CalendarCheck,
  weekly: CalendarDays,
  monthly: CalendarRange,
};

export function StepCheckinFrequency({ onComplete, onBack }: StepCheckinFrequencyProps) {
  const { formData, updateFormData, submitOnboarding, isSubmitting, error } =
    useOnboardingStore();

  const canContinue = formData.checkinFrequency !== null;

  const handleSubmit = async () => {
    const result = await submitOnboarding();
    if (result.success) {
      onComplete();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">How often would you like to check in?</h1>
        <p className="mt-3 text-sage-500">
          Choose a rhythm that fits your life. You can change this anytime in Settings.
        </p>
      </div>

      <div className="grid gap-4">
        {CHECKIN_FREQUENCIES.map((freq) => {
          const Icon = frequencyIcons[freq.value];
          const isSelected = formData.checkinFrequency === freq.value;
          return (
            <Card
              key={freq.value}
              variant={isSelected ? 'elevated' : 'default'}
              padding="md"
              onClick={() => updateFormData({ checkinFrequency: freq.value as CheckinFrequency })}
              className={isSelected ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-500/20' : ''}
            >
              <div className="flex items-start gap-4">
                <div
                  className={[
                    'rounded-lg p-2',
                    isSelected ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-500',
                  ].join(' ')}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg text-sage-800">{freq.label}</h3>
                    {freq.value === 'weekly' && (
                      <Badge variant="success" size="sm">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-sage-500">{freq.description}</p>
                  {freq.value === 'monthly' && (
                    <p className="mt-2 text-sm text-sage-400">
                      Heads up: monthly check-ins usually aren&apos;t frequent enough for pattern
                      detection. You&apos;ll build a record, but insights may be limited.
                    </p>
                  )}
                </div>
              </div>
            </Card>
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
