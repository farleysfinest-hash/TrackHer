interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  name: string;
}

export function RadioGroup({ label, options, value, onChange, error, name }: RadioGroupProps) {
  return (
    <div className="w-full">
      {label && <p className="mb-3 text-sm font-medium text-sage-700">{label}</p>}
      <div className="space-y-3" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={[
                'flex cursor-pointer flex-col rounded-xl border p-4 transition-colors duration-150',
                isSelected
                  ? 'border-sage-500 bg-sage-50'
                  : 'border-sand-200 bg-sand-50 hover:border-sage-300 hover:bg-sage-50/50',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => onChange(option.value)}
                  className="mt-1 h-4 w-4 border-sand-300 text-sage-500 focus:ring-sage-500"
                />
                <div>
                  <span className="font-medium text-sage-800">{option.label}</span>
                  {option.description && (
                    <p className="mt-1 text-sm text-sage-500">{option.description}</p>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
