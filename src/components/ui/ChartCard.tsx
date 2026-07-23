import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal } from './Modal';
import { tapMedium } from '../../lib/haptics';

const LONG_PRESS_MS = 450;
/** Finger tremor / Recharts noise — cancel only on a real drag. */
const MOVE_CANCEL_PX = 28;

export type ChartCardChildren =
  | ReactNode
  | ((opts: { interactive: boolean }) => ReactNode);

interface ChartCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ChartCardChildren;
  minHeight?: string;
  /** Min height inside the expand modal (defaults larger than minHeight). */
  expandedMinHeight?: string;
  /** Long-press the chart to open full screen (tooltips only work there). */
  expandable?: boolean;
  isEmpty?: boolean;
  emptyState?: {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
}

function renderChildren(children: ChartCardChildren, interactive: boolean): ReactNode {
  return typeof children === 'function' ? children({ interactive }) : children;
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  /** True while a long-press timer is armed — used to ignore late pointer noise. */
  const armedRef = useRef(false);

  const clearPress = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
    armedRef.current = false;
  }, []);

  const openExpanded = useCallback(() => {
    clearPress();
    void tapMedium();
    setExpanded(true);
  }, [clearPress]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!showExpand || e.button !== 0) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('button, a, input, select, textarea, label, [role="button"]')) return;
      startRef.current = { x: e.clientX, y: e.clientY };
      armedRef.current = true;
      if (timerRef.current != null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!armedRef.current) return;
        openExpanded();
      }, LONG_PRESS_MS);
    },
    [showExpand, openExpanded],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!armedRef.current || !startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
        clearPress();
      }
    },
    [clearPress],
  );

  const headerActions = actions ? (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
  ) : null;

  const emptyBody =
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
    ) : null;

  return (
    <>
      <Card variant="outlined" padding="lg">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-lg text-sage-800">{title}</h3>
            {description && <p className="mt-1 text-sm text-sage-500">{description}</p>}
            {showExpand && (
              <p className="mt-1 text-xs text-sage-400">Long-press chart to expand</p>
            )}
          </div>
          {headerActions}
        </div>
        {emptyBody ?? (
          <div
            style={{ minHeight }}
            className={[
              'select-none',
              // Let long-press hit the card, not Recharts (which steals touch for cursors/tooltips).
              showExpand
                ? 'touch-manipulation [&_.recharts-wrapper]:pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto [&_[role=button]]:pointer-events-auto'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={clearPress}
            onPointerCancel={clearPress}
            onContextMenu={(e) => {
              if (showExpand) e.preventDefault();
            }}
          >
            {renderChildren(children, false)}
          </div>
        )}
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
          <div style={{ minHeight: expandedMinHeight }}>
            {renderChildren(children, true)}
          </div>
        </Modal>
      )}
    </>
  );
}
