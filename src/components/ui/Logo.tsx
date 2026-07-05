import { APP_NAME } from '../../lib/constants';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <span
      className={['font-display font-semibold tracking-tight text-sage-700', sizeClasses[size], className]
        .filter(Boolean)
        .join(' ')}
      style={{ letterSpacing: '-0.02em' }}
    >
      {APP_NAME}
    </span>
  );
}
