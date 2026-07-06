import { useMedicationEntryStore } from '../../stores/medicationEntryStore';
import { HORMONE_CATEGORIES } from '../../lib/medicationConstants';
import { getHormoneColor, getHormoneLabel } from '../../utils/medicationHelpers';
import type { HormoneCategory } from '../../types/database';

export function StepHormoneCategory() {
  const { selectedHormone, setHormone, setCustomEntry, goToStep } = useMedicationEntryStore();

  const handleSelect = (value: HormoneCategory) => {
    setHormone(value);

    setTimeout(() => {
      if (value === 'other') {
        setCustomEntry(true);
        goToStep(4);
      } else {
        goToStep(2);
      }
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-sage-800">What type of medication?</h2>
        <p className="mt-2 text-sage-500">Select the hormone category that best describes this medication.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {HORMONE_CATEGORIES.map((cat) => {
          const isSelected = selectedHormone === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleSelect(cat.value)}
              className={[
                'rounded-xl border p-4 text-left transition-colors duration-150',
                isSelected
                  ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-500/20'
                  : 'border-sand-200 bg-white hover:border-sage-300 hover:bg-sage-50/50',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <span
                  className={[
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    getHormoneColor(cat.value),
                  ].join(' ')}
                >
                  {getHormoneLabel(cat.value).charAt(0)}
                </span>
                <div>
                  <span className="font-medium text-sage-800">{cat.label}</span>
                  <p className="mt-1 text-sm text-sage-500">{cat.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
