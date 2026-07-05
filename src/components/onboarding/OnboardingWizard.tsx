import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useAuth } from '../../hooks/useAuth';
import { StepProfile } from './StepProfile';
import { StepMenopauseStage } from './StepMenopauseStage';
import { StepCheckinFrequency } from './StepCheckinFrequency';
import { OnboardingComplete } from './OnboardingComplete';
import { MedicalDisclaimer } from '../ui/MedicalDisclaimer';

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { currentStep, updateFormData, reset } = useOnboardingStore();
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (user) {
      updateFormData({
        displayName: profile?.display_name ?? user.user_metadata?.display_name ?? '',
        email: user.email ?? '',
        hasUterus: profile?.has_uterus ?? null,
        dateOfBirth: profile?.date_of_birth ?? '',
      });
    }
    return () => reset();
  }, [user, profile, updateFormData, reset]);

  const handleComplete = () => {
    setIsComplete(true);
  };

  if (isComplete) {
    return <OnboardingComplete onGoToDashboard={() => navigate('/dashboard')} />;
  }

  const progress = (currentStep / 3) * 100;

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-8 md:py-12">
      {!isComplete && (
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-sage-500">
            <span>Step {currentStep} of 3</span>
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
        {currentStep === 1 && <StepProfile onNext={() => useOnboardingStore.getState().nextStep()} />}
        {currentStep === 2 && (
          <StepMenopauseStage
            onNext={() => useOnboardingStore.getState().nextStep()}
            onBack={() => useOnboardingStore.getState().prevStep()}
          />
        )}
        {currentStep === 3 && (
          <StepCheckinFrequency
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
