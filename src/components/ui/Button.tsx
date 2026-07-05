import type { ButtonHTMLAttributes } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-sage-500 text-white hover:bg-sage-600 active:bg-sage-700 focus-visible:ring-sage-500',
  secondary:
    'bg-sand-100 text-sage-700 hover:bg-sand-200 border border-sand-200 focus-visible:ring-sage-500',
  ghost: 'bg-transparent text-sage-600 hover:bg-sage-50 focus-visible:ring-sage-500',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20 focus-visible:ring-danger',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Loading...',
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
