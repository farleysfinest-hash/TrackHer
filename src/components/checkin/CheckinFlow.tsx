import { useEffect } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useAuthStore } from '../../stores/authStore';
import { getPrimaryInstrument } from '../../data/instruments/registry';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { formatLoggingDate } from '../../utils/formatters';
import { clearCheckinDraft, saveCheckinDraft } from '../../lib/checkinDraft';
import { StepIndicator } from '../ui/StepIndicator';
import { DailyChannels } from './DailyChannels';
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
  const targetDate = useCheckinStore((s) => s.targetDate);
  const isEditing = useCheckinStore((s) => s.isEditing);
  const nextStep = useCheckinStore((s) => s.nextStep);
  const prevStep = useCheckinStore((s) => s.prevStep);
  const getStepCount = useCheckinStore((s) => s.getStepCount);
  const reset = useCheckinStore((s) => s.reset);
  const setInstrumentId = useCheckinStore((s) => s.setInstrumentId);
  const userId = useAuthStore((s) => s.user?.id);
  const strawStage = useAuthStore((s) => s.profile?.straw_stage ?? '-2');
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const todayStr = getLocalDateISO(timezone);
  const isBackdated = targetDate !== todayStr;
  const totalSteps = getStepCount();

  useEffect(() => {
    setInstrumentId(getPrimaryInstrument(strawStage).id);
  }, [strawStage, setInstrumentId]);

  useEffect(() => {
    if (isEditing) return;
    if (!userId) return;

    const write = () => {
      const s = useCheckinStore.getState();
      saveCheckinDraft({
        v: 1,
        userId,
        targetDate: s.targetDate,
        mode: s.mode,
        savedAt: new Date().toISOString(),
        currentStep: s.currentStep,
        instrumentId: s.instrumentId,
        energyLevel: s.energyLevel,
        moodLevel: s.moodLevel,
        sleepQuality: s.sleepQuality,
        energyComplete: s.energyComplete,
        moodComplete: s.moodComplete,
        sleepComplete: s.sleepComplete,
        flareSelected: s.flareSelected,
        flarePreLogged: s.flarePreLogged,
        mrsScores: s.mrsScores,
        extendedSymptoms: s.extendedSymptoms,
        pendingKeepWatch: s.pendingKeepWatch,
        notes: s.notes,
      });
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useCheckinStore.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(write, 400);
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [isEditing, userId]);

  const handleComplete = () => {
    clearCheckinDraft();
    reset();
    onComplete();
  };

  const handleClose = () => {
    reset(); // clears in-memory state only — the localStorage draft is untouched
    onClose();
  };

  const handleDiscard = () => {
    clearCheckinDraft();
    reset();
    onClose();
  };

  const renderStep = () => {
    if (mode === 'quick') {
      switch (currentStep) {
        case 1:
          return <DailyChannels onNext={nextStep} />;
        case 2:
          return <CheckinSummary onBack={prevStep} onSuccess={handleComplete} />;
        default:
          return null;
      }
    }

    switch (currentStep) {
      case 1:
        return <DailyChannels onNext={nextStep} />;
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
        <div>
          <h1 className="font-display text-xl text-sage-800">
            {mode === 'quick' ? 'Quick pulse' : 'Full Check-in'}
          </h1>
          {isBackdated && (
            <p className="mt-0.5 text-sm text-sage-500">
              Logging for {formatLoggingDate(targetDate)}
            </p>
          )}
        </div>
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
          {!isEditing && (
            <button
              type="button"
              onClick={handleDiscard}
              className="mt-8 text-sm text-sage-500 underline hover:text-sage-700"
            >
              Discard this check-in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
