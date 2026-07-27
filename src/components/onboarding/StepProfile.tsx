import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateOfBirthInput } from '../ui/DateOfBirthInput';
import { TimezoneSelect } from '../ui/TimezoneSelect';
import { isValidTimeZone } from '../../utils/localDate';
import { setUiValue } from '../../lib/uiState';
import {
  AVATAR_STAMP_KEY,
  getProfileAvatarStamp,
  uploadProfileAvatar,
} from '../../utils/profileAvatar';
import { useProfileAvatarUrl } from '../../hooks/useProfileAvatarUrl';

interface StepProfileProps {
  onNext: () => void;
}

export function StepProfile({ onNext }: StepProfileProps) {
  const { formData, updateFormData } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const avatarUrl = useProfileAvatarUrl();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarNote, setAvatarNote] = useState<string | null>(null);

  const canContinue =
    formData.displayName.trim().length > 0 &&
    formData.hasUterusConfirmed &&
    isValidTimeZone(formData.timezone);

  const hasAvatar = getProfileAvatarStamp(profile) !== null || Boolean(avatarUrl);

  /**
   * Optional, never gates Continue. Upload failures are logged as a soft note and the
   * user keeps moving — onboarding is the funnel where a trap costs the account.
   */
  const handleAvatarPick = async (file: File | undefined) => {
    if (!file || !user?.id) return;
    setAvatarBusy(true);
    setAvatarNote(null);
    try {
      const stamp = await uploadProfileAvatar(user.id, file);
      setUiValue(AVATAR_STAMP_KEY, stamp);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not upload that picture.';
      console.warn('Onboarding avatar upload skipped:', message);
      setAvatarNote('Picture didn’t save — you can add one later in Settings.');
    } finally {
      setAvatarBusy(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Welcome to TrackHer</h1>
        <p className="mt-3 text-sage-500 leading-relaxed">
          Let&apos;s set up your profile so we can personalize your experience. This should take
          about 2 minutes.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-sage-700">
          Profile picture <span className="font-normal text-sage-500">(optional)</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sage-500 text-lg font-medium text-on-accent">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (formData.displayName.trim().charAt(0) || formData.email.charAt(0) || '?').toUpperCase()
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void handleAvatarPick(event.target.files?.[0])}
          />
          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            isLoading={avatarBusy}
            loadingText="Uploading…"
          >
            <Camera className="h-4 w-4" aria-hidden />
            {hasAvatar ? 'Change picture' : 'Add picture'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-sage-500">
          You can skip this and add a picture later in Settings. Continue never waits on the upload.
        </p>
        {avatarNote && <p className="mt-2 text-sm text-sage-600">{avatarNote}</p>}
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
