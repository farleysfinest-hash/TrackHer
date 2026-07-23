import { Check } from 'lucide-react';

interface SymptomChipProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  variant?: 'select' | 'watch';
  watchSelected?: boolean;
  disabled?: boolean;
}

export function SymptomChip({
  label,
  checked,
  onToggle,
  variant = 'select',
  watchSelected = false,
  disabled = false,
}: SymptomChipProps) {
  const isWatch = variant === 'watch';

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-1',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        isWatch
          ? watchSelected
            ? 'border-sage-600 bg-sage-600 text-on-accent'
            : 'border-sand-200 bg-sand-50 text-sage-600 hover:border-sage-300'
          : checked
            ? 'border-sage-500 bg-sage-50 text-sage-700'
            : 'border-sand-200 bg-sand-50 text-sage-600 hover:border-sage-300',
      ].join(' ')}
    >
      {!isWatch && (
        <span
          className={[
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
            checked ? 'border-sage-500 bg-sage-500 text-on-accent' : 'border-sand-300 bg-sand-50',
          ].join(' ')}
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      )}
      {label}
      {isWatch && watchSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}
