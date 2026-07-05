interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={[
        'animate-spin rounded-full border-sage-200 border-t-sage-500',
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50">
      <LoadingSpinner size="lg" />
    </div>
  );
}
