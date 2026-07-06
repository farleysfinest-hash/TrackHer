import { useEffect } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useAuthStore } from '../../stores/authStore';
import { getPrimaryInstrument } from '../../data/instruments/registry';
import { StepIndicator } from '../ui/StepIndicator';
import { WellbeingScore } from './WellbeingScore';
import { MRSSection } from './MRSSection';
import { ExtendedSymptomsSection } from './ExtendedSymptomsSection';
import { CheckinNotes } from './CheckinNotes';
import { CheckinSummary } from './CheckinSummary';
import { X } from 'lucide-react';

interface CheckinFlowProps {
  onClose: () => void;
  onComplete: () => void;
}

export function CheckinFlow({ onClose, onComplete }: CheckinFlowProps) {
  const mode = useCheckinStore((s) => s.mode);
  const currentStep = useCheckinStore((s) => s.currentStep);
  const nextStep = useCheckinStore((s) => s.nextStep);
  const prevStep = useCheckinStore((s) => s.prevStep);
  const getStepCount = useCheckinStore((s) => s.getStepCount);
  const reset = useCheckinStore((s) => s.reset);
  const setInstrumentId = useCheckinStore((s) => s.setInstrumentId);
  const strawStage = useAuthStore((s) => s.profile?.straw_stage ?? '-2');
  const totalSteps = getStepCount();

  useEffect(() => {
    setInstrumentId(getPrimaryInstrument(strawStage).id);
  }, [strawStage, setInstrumentId]);

  const handleComplete = () => {
    reset();
    onComplete();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const renderStep = () => {
    if (mode === 'quick') {
      switch (currentStep) {
        case 1:
          return <WellbeingScore onNext={nextStep} />;
        case 2:
          return <MRSSection onNext={nextStep} onBack={prevStep} />;
        case 3:
          return <CheckinSummary onBack={prevStep} onSuccess={handleComplete} />;
        default:
          return null;
      }
    }

    switch (currentStep) {
      case 1:
        return <WellbeingScore onNext={nextStep} />;
      case 2:
        return <MRSSection onNext={nextStep} onBack={prevStep} />;
      case 3:
        return (
          <ExtendedSymptomsSection
            onNext={nextStep}
            onBack={prevStep}
            onSkip={nextStep}
          />
        );
      case 4:
        return <CheckinNotes onNext={nextStep} onBack={prevStep} />;
      case 5:
        return <CheckinSummary onBack={prevStep} onSuccess={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-sand-50">
      <header className="flex items-center justify-between border-b border-sand-200 bg-white px-6 py-4">
        <h1 className="font-display text-xl text-sage-800">
          {mode === 'quick' ? 'Quick Check-in' : 'Full Check-in'}
        </h1>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-2 text-sage-400 hover:bg-sage-50"
          aria-label="Close check-in"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-[640px]">
          <StepIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            label={`Step ${currentStep} of ${totalSteps}`}
          />
          <div className="animate-fade-in" key={currentStep}>
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
