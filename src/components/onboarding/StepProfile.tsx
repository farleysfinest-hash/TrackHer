import { useOnboardingStore } from '../../stores/onboardingStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateOfBirthInput } from '../ui/DateOfBirthInput';
import { TimezoneSelect } from '../ui/TimezoneSelect';
import { isValidTimeZone } from '../../utils/localDate';

interface StepProfileProps {
  onNext: () => void;
}

export function StepProfile({ onNext }: StepProfileProps) {
  const { formData, updateFormData } = useOnboardingStore();

  const canContinue =
    formData.displayName.trim().length > 0 &&
    formData.hasUterusConfirmed &&
    isValidTimeZone(formData.timezone);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Welcome to TrackHer</h1>
        <p className="mt-3 text-sage-500 leading-relaxed">
          Let&apos;s set up your profile so we can personalize your experience. This should take
          about 2 minutes.
        </p>
      </div>

      <Input
        label="Your Name"
        value={formData.displayName}
        onChange={(event) => updateFormData({ displayName: event.target.value })}
      />

      <Input label="Email" type="email" value={formData.email} readOnly className="bg-sage-50" />

      <DateOfBirthInput
        label="Date of Birth (optional)"
        value={formData.dateOfBirth}
        onChange={(dateOfBirth) => updateFormData({ dateOfBirth })}
        helperText="Helps us provide age-appropriate context for your data"
      />

      <div>
        <p className="mb-3 text-sm font-medium text-sage-700">
          Do you currently have your uterus?
        </p>
        <p className="mb-3 text-sm text-sage-500">
          This is clinically relevant — women with a uterus typically need progesterone alongside
          estrogen to protect the endometrium. Not sure is a completely valid answer, and you can
          update this anytime in Settings.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateFormData({ hasUterus: true, hasUterusConfirmed: true })}
            className={[
              'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
              formData.hasUterusConfirmed && formData.hasUterus === true
                ? 'border-sage-500 bg-sage-50 text-sage-700'
                : 'border-sand-200 bg-sand-50 text-sage-600 hover:border-sage-300',
            ].join(' ')}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => updateFormData({ hasUterus: false, hasUterusConfirmed: true })}
            className={[
              'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
              formData.hasUterusConfirmed && formData.hasUterus === false
                ? 'border-sage-500 bg-sage-50 text-sage-700'
                : 'border-sand-200 bg-sand-50 text-sage-600 hover:border-sage-300',
            ].join(' ')}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => updateFormData({ hasUterus: null, hasUterusConfirmed: true })}
            className={[
              'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
              formData.hasUterusConfirmed && formData.hasUterus === null
                ? 'border-sage-500 bg-sage-50 text-sage-700'
                : 'border-sand-200 bg-sand-50 text-sage-600 hover:border-sage-300',
            ].join(' ')}
          >
            I&apos;m not sure
          </button>
        </div>
      </div>

      <TimezoneSelect
        value={formData.timezone}
        onChange={(timezone) => updateFormData({ timezone })}
      />

      <Button fullWidth disabled={!canContinue} onClick={onNext}>
        Continue
      </Button>
    </div>
  );
}
