type BadgeVariant =
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'danger'
  | 'attention'
  | 'review'
  | 'reference'
  | 'affirmative';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  neutral: 'bg-sage-100 text-sage-600',
  danger: 'bg-danger/10 text-danger',
  attention: 'bg-sage-200 text-sage-800',
  review: 'bg-sage-100 text-sage-700',
  affirmative: 'bg-sage-50 text-sage-700',
  reference: 'bg-sand-200 text-sage-600',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
