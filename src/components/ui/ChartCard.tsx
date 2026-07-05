import type { ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface ChartCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  minHeight?: string;
  isEmpty?: boolean;
  emptyState?: {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
}

export function ChartCard({
  title,
  description,
  actions,
  children,
  minHeight = '280px',
  isEmpty,
  emptyState,
}: ChartCardProps) {
  return (
    <Card variant="outlined" padding="lg">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-lg text-sage-800">{title}</h3>
          {description && <p className="mt-1 text-sm text-sage-500">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {isEmpty && emptyState ? (
        <div
          className="flex flex-col items-center justify-center text-center text-sage-500"
          style={{ minHeight }}
        >
          <p className="max-w-sm text-sm">{emptyState.message}</p>
          {emptyState.actionLabel && emptyState.onAction && (
            <Button variant="secondary" size="sm" className="mt-4" onClick={emptyState.onAction}>
              {emptyState.actionLabel}
            </Button>
          )}
        </div>
      ) : (
        <div style={{ minHeight }}>{children}</div>
      )}
    </Card>
  );
}
