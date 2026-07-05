import type { ReactNode } from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined';
type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-white border border-sand-200',
  elevated: 'bg-white border border-sand-200 shadow-sm',
  outlined: 'bg-transparent border border-sand-200',
};

const paddingClasses: Record<CardPadding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  onClick,
}: CardProps) {
  return (
    <div
      className={[
        'rounded-xl',
        variantClasses[variant],
        paddingClasses[padding],
        onClick ? 'cursor-pointer transition-colors hover:border-sage-300' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
