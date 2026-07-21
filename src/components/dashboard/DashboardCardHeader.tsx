import type { LucideIcon } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';

interface DashboardCardHeaderProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  /** When true, show success check instead of the category icon. */
  done?: boolean;
}

/**
 * Shared Pattern B chrome for dashboard action/status cards:
 * icon + uppercase eyebrow + display title (+ optional body).
 * Chips = commit now; full-width buttons = open a timed flow.
 */
export function DashboardCardHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  done = false,
}: DashboardCardHeaderProps) {
  const Leading = done ? CheckCircle2 : Icon;

  return (
    <div className="flex items-start gap-3">
      <Leading
        className={[
          'h-5 w-5 shrink-0',
          done ? 'text-success' : 'text-sage-500',
        ].join(' ')}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-sage-500">{eyebrow}</p>
        <h2 className="mt-1 font-display text-lg text-sage-800">{title}</h2>
        {description ? <p className="mt-1 text-sm text-sage-500">{description}</p> : null}
      </div>
    </div>
  );
}
