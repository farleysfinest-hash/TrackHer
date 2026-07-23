import { useState, type ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal } from './Modal';

interface ChartCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  minHeight?: string;
  /** Min height inside the expand modal (defaults larger than minHeight). */
  expandedMinHeight?: string;
  /** Show Expand → full-screen modal with the same chart body. */
  expandable?: boolean;
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
  expandedMinHeight = '70vh',
  expandable = false,
  isEmpty,
  emptyState,
}: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);
  const showExpand = expandable && !isEmpty;

  const expandButton = showExpand ? (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-sand-200 px-2.5 py-1.5 text-xs font-medium text-sage-600 transition-colors hover:bg-sage-50"
      aria-label={`Expand ${title} to full screen`}
    >
      <Maximize2 className="h-3.5 w-3.5" aria-hidden />
      Expand
    </button>
  ) : null;

  const headerActions =
    expandButton || actions ? (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {actions}
        {expandButton}
      </div>
    ) : null;

  const body =
    isEmpty && emptyState ? (
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
    );

  return (
    <>
      <Card variant="outlined" padding="lg">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-lg text-sage-800">{title}</h3>
            {description && <p className="mt-1 text-sm text-sage-500">{description}</p>}
          </div>
          {headerActions}
        </div>
        {body}
      </Card>

      {showExpand && (
        <Modal
          isOpen={expanded}
          onClose={() => setExpanded(false)}
          title={title}
          size="full"
        >
          {description && <p className="mb-4 text-sm text-sage-500">{description}</p>}
          {actions && <div className="mb-4 flex flex-wrap gap-2">{actions}</div>}
          <div style={{ minHeight: expandedMinHeight }}>{children}</div>
        </Modal>
      )}
    </>
  );
}
