import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { DELIVERY_METHOD_LABELS } from '../../lib/medicationConstants';
import { getMethodsForHormone } from '../../utils/medicationHelpers';
import type { DeliveryMethod } from '../../types/database';
import { Button } from '../ui/Button';

interface StepDeliveryMethodProps {
  onBack: () => void;
}

export function StepDeliveryMethod({ onBack }: StepDeliveryMethodProps) {
  const { selectedHormone, selectedMethod, setMethod, goToStep } = useMedicationEntryStore();

  if (!selectedHormone) return null;

  const availableMethods = getMethodsForHormone(selectedHormone);

  const handleSelect = (method: DeliveryMethod) => {
    setMethod(method);
    setTimeout(() => goToStep(3), 300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">How is it delivered?</h2>
        <p className="mt-2 text-sage-500">Choose the delivery method for this medication.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {availableMethods.map((method) => {
          const info = DELIVERY_METHOD_LABELS[method];
          const isSelected = selectedMethod === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => handleSelect(method)}
              className={[
                'rounded-xl border p-4 text-left transition-colors duration-150',
                isSelected
                  ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-500/20'
                  : 'border-sand-200 bg-sand-50 hover:border-sage-300 hover:bg-sage-50/50',
              ].join(' ')}
            >
              <span className="font-medium text-sage-800">{info.label}</span>
              <p className="mt-1 text-sm text-sage-500">{info.description}</p>
            </button>
          );
        })}
      </div>

      <Button variant="secondary" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
