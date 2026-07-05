import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import type { TrendDirection } from '../../utils/labHelpers';

interface TrendArrowProps {
  direction: TrendDirection;
  previousValue?: number | null;
  className?: string;
}

export function TrendArrow({ direction, previousValue, className = '' }: TrendArrowProps) {
  if (!direction) return null;

  const Icon =
    direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : ArrowRight;

  return (
    <span className={`inline-flex items-center gap-1 text-sage-400 ${className}`}>
      <Icon className="h-4 w-4" aria-hidden />
      {previousValue !== null && previousValue !== undefined && (
        <span className="text-xs text-sage-400">prev: {previousValue}</span>
      )}
    </span>
  );
}
