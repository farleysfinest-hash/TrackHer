import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-sage-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sage-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={[
            'w-full rounded-lg border bg-sand-50 px-4 py-3 text-base text-sage-800',
            'placeholder:text-sand-400',
            'transition-colors duration-150',
            'focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500/20',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-sand-200',
            leftIcon ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400">{rightIcon}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-sage-400">{helperText}</p>}
    </div>
  );
}
