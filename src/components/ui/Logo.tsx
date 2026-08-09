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
      className={['shrink-0 font-display font-semibold tracking-tight text-sage-700', sizeClasses[size], className]
        .filter(Boolean)
        .join(' ')}
      style={{ letterSpacing: '-0.02em' }}
    >
      {APP_NAME}
      <span className="ml-2 align-middle text-[10px] font-normal uppercase tracking-widest text-sage-400">
        beta v1.0
      </span>
    </span>
  );
}
