import { X } from 'lucide-react';
import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { StepIndicator } from '../ui/StepIndicator';
import { StepHormoneCategory } from './StepHormoneCategory';
import { StepDeliveryMethod } from './StepDeliveryMethod';
import { StepProduct } from './StepProduct';
import { StepDoseFrequency } from './StepDoseFrequency';
import { StepReview } from './StepReview';
import { CustomMedicationForm } from './CustomMedicationForm';

interface MedicationEntryWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function MedicationEntryWizard({ isOpen, onClose, onComplete }: MedicationEntryWizardProps) {
  const {
    currentStep,
    isCustomEntry,
    prevStep,
    goToStep,
    setCustomEntry,
    reset,
  } = useMedicationEntryStore();

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSuccess = () => {
    reset();
    onComplete();
  };

  const handleAddAnother = () => {
    reset();
  };

  const handleCustomFromProduct = () => {
    setCustomEntry(true);
    goToStep(4);
  };

  const totalSteps = 5;
  const displayStep = isCustomEntry && currentStep >= 4 ? 4 : currentStep;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-sand-50"
      role="dialog"
      aria-modal="true"
      aria-label="Add medication"
    >
      <header className="safe-area-top flex items-center justify-between border-b border-sand-200 bg-white px-6 pb-4">
        <h1 className="font-display text-xl text-sage-800">Add Medication</h1>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-2 text-sage-400 hover:bg-sage-50 hover:text-sage-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="safe-area-bottom flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-[640px]">
          {currentStep < 5 && (
            <StepIndicator currentStep={displayStep} totalSteps={totalSteps} />
          )}

          <div className="animate-fade-in" key={`${currentStep}-${isCustomEntry}`}>
            {currentStep === 1 && <StepHormoneCategory />}

            {currentStep === 2 && !isCustomEntry && (
              <StepDeliveryMethod onBack={prevStep} />
            )}

            {currentStep === 3 && !isCustomEntry && (
              <StepProduct onBack={prevStep} onCustom={handleCustomFromProduct} />
            )}

            {currentStep === 4 && isCustomEntry && (
              <CustomMedicationForm onBack={prevStep} onNext={() => goToStep(5)} />
            )}

            {currentStep === 4 && !isCustomEntry && (
              <StepDoseFrequency onBack={prevStep} onNext={() => goToStep(5)} />
            )}

            {currentStep === 5 && (
              <StepReview
                onBack={prevStep}
                onSuccess={handleSuccess}
                onAddAnother={handleAddAnother}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
