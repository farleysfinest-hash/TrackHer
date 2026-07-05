import { useOnboardingStore } from '../../stores/onboardingStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface StepProfileProps {
  onNext: () => void;
}

export function StepProfile({ onNext }: StepProfileProps) {
  const { formData, updateFormData } = useOnboardingStore();

  const canContinue = formData.displayName.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Welcome to TrackHer</h1>
        <p className="mt-3 text-sage-500 leading-relaxed">
          Let&apos;s set up your profile so we can personalize your experience. This should take
          about 2 minutes.
        </p>
      </div>

      <Input label="Your Name" value={formData.displayName} readOnly className="bg-sage-50" />

      <Input label="Email" type="email" value={formData.email} readOnly className="bg-sage-50" />

      <Input
        label="Date of Birth (optional)"
        type="date"
        value={formData.dateOfBirth}
        onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
        helperText="Helps us provide age-appropriate context for your data"
      />

      <div>
        <p className="mb-3 text-sm font-medium text-sage-700">
          Do you still have your uterus? (optional)
        </p>
        <p className="mb-3 text-sm text-sage-500">
          This is clinically relevant — women with a uterus typically need progesterone alongside
          estrogen to protect the endometrium.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateFormData({ hasUterus: true })}
            className={[
              'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
              formData.hasUterus === true
                ? 'border-sage-500 bg-sage-50 text-sage-700'
                : 'border-sand-200 bg-white text-sage-600 hover:border-sage-300',
            ].join(' ')}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => updateFormData({ hasUterus: false })}
            className={[
              'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
              formData.hasUterus === false
                ? 'border-sage-500 bg-sage-50 text-sage-700'
                : 'border-sand-200 bg-white text-sage-600 hover:border-sage-300',
            ].join(' ')}
          >
            No
          </button>
        </div>
      </div>

      <Button fullWidth disabled={!canContinue} onClick={onNext}>
        Continue
      </Button>
    </div>
  );
}
