import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useAuthStore } from '../../stores/authStore';
import { StepWelcome } from './StepWelcome';
import { StepProfile } from './StepProfile';
import { StepStrawStaging } from './StepStrawStaging';
import { StepSymptomSelection } from './StepSymptomSelection';
import { StepCheckinIntro } from './StepCheckinIntro';
import { StepCheckinDay } from './StepCheckinDay';
import { OnboardingComplete } from './OnboardingComplete';
import { MedicalDisclaimer } from '../ui/MedicalDisclaimer';
import { getActiveTimezone } from '../../utils/localDate';

const TOTAL_STEPS = 5;

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { currentStep, updateFormData } = useOnboardingStore();
  const currentUser = useAuthStore((state) => state.user);
  const currentProfile = useAuthStore((state) => state.profile);
  const [isComplete, setIsComplete] = useState(false);
  const hydratedProfileId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    if (!currentProfile) return;
    if (hydratedProfileId.current === currentProfile.id) return;

    hydratedProfileId.current = currentProfile.id;
    updateFormData({
      // The profile row is authoritative. Auth metadata can contain a stale signup name after a
      // full reset until the session token refreshes, so it must never repopulate reset data.
      displayName: currentProfile.display_name ?? '',
      email: currentUser.email ?? '',
      hasUterus: currentProfile.has_uterus_confirmed_at
        ? currentProfile.has_uterus
        : null,
      hasUterusConfirmed: Boolean(currentProfile.has_uterus_confirmed_at),
      timezone: currentProfile.timezone_confirmed_at && currentProfile.timezone
        ? currentProfile.timezone
        : getActiveTimezone(currentProfile.timezone),
      dateOfBirth: currentProfile.date_of_birth ?? '',
      lastPeriodDate: currentProfile.last_period_date ?? '',
    });
  }, [currentProfile, currentUser, updateFormData]);

  useEffect(
    () => () => {
      useOnboardingStore.getState().reset();
    },
    [],
  );

  const handleComplete = () => {
    setIsComplete(true);
  };

  if (isComplete) {
    return <OnboardingComplete onGoToDashboard={() => navigate('/dashboard')} />;
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-8 md:py-12">
      {currentStep !== 0 && (
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-sage-500">
            <span>Step {currentStep} of {TOTAL_STEPS}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sage-100">
            <div
              className="h-full rounded-full bg-sage-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="animate-fade-in" key={currentStep}>
        {currentStep === 0 && (
          <StepWelcome onNext={() => useOnboardingStore.getState().nextStep()} />
        )}
        {currentStep === 1 && (
          <StepProfile onNext={() => useOnboardingStore.getState().nextStep()} />
        )}
        {currentStep === 2 && (
          <StepStrawStaging
            onNext={() => useOnboardingStore.getState().nextStep()}
            onBack={() => useOnboardingStore.getState().prevStep()}
          />
        )}
        {currentStep === 3 && (
          <StepSymptomSelection
            onNext={() => useOnboardingStore.getState().nextStep()}
            onBack={() => useOnboardingStore.getState().prevStep()}
          />
        )}
        {currentStep === 4 && (
          <StepCheckinIntro
            onNext={() => useOnboardingStore.getState().nextStep()}
            onBack={() => useOnboardingStore.getState().prevStep()}
          />
        )}
        {currentStep === 5 && (
          <StepCheckinDay
            onComplete={handleComplete}
            onBack={() => useOnboardingStore.getState().prevStep()}
          />
        )}
      </div>

      <div className="mt-8">
        <MedicalDisclaimer variant="block" />
      </div>
    </div>
  );
}
