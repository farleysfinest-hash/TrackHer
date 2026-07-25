import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { nearestDateForRatio } from '../../utils/chartScrub';
import { beginSelectionGesture, endSelectionGesture } from '../../lib/selectionGesture';

interface ChartScrubInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface ChartScrubRegionProps {
  dates: string[];
  /** Full chart-domain order when selectable points are sparse within the plotted range. */
  domainDates?: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  ariaLabel: string;
  children: ReactNode;
  insets?: ChartScrubInsets;
  className?: string;
  enabled?: boolean;
}

const INTENT_THRESHOLD_PX = 6;

export function ChartScrubRegion({
  dates,
  domainDates,
  selectedDate,
  onSelectDate,
  ariaLabel,
  children,
  insets,
  className = '',
  enabled = true,
}: ChartScrubRegionProps) {
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    scrubbing: boolean;
  } | null>(null);

  // A chart unmounting mid-scrub (rotation, modal close) would otherwise leave
  // the feedback generator held open.
  useEffect(() => endSelectionGesture, []);

  const uniqueDates = useMemo(() => [...new Set(dates)], [dates]);
  const chartDomainDates = useMemo(
    () => [...new Set(domainDates && domainDates.length > 0 ? domainDates : uniqueDates)],
    [domainDates, uniqueDates],
  );
  const selectedIndex = selectedDate ? uniqueDates.indexOf(selectedDate) : -1;

  const overlayStyle: CSSProperties = {
    top: insets?.top ?? 0,
    right: insets?.right ?? 0,
    bottom: insets?.bottom ?? 0,
    left: insets?.left ?? 0,
  };

  const resolveDate = (clientX: number, element: HTMLElement) => {
    if (uniqueDates.length === 0) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return uniqueDates[0] ?? null;
    const ratio = (clientX - rect.left) / rect.width;
    return nearestDateForRatio(uniqueDates, chartDomainDates, ratio);
  };

  const selectAt = (clientX: number, element: HTMLElement) => {
    const date = resolveDate(clientX, element);
    if (date) onSelectDate(date);
  };

  const endPointer = (element: HTMLElement, pointerId: number) => {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
    pointerRef.current = null;
    endSelectionGesture();
  };

  return (
    <div className={['chart-scrub-container relative min-w-0', className].filter(Boolean).join(' ')}>
      {children}
      {enabled && uniqueDates.length > 0 && (
        <div
          data-chart-scrub-region
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={1}
          aria-valuemax={uniqueDates.length}
          aria-valuenow={selectedIndex >= 0 ? selectedIndex + 1 : undefined}
          aria-valuetext={selectedDate ?? 'No date selected'}
          className="chart-scrub-region absolute z-10"
          style={overlayStyle}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            pointerRef.current = {
              id: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              scrubbing: event.pointerType === 'mouse',
            };
            if (event.pointerType === 'mouse') {
              // Mouse scrubs from the first press, so the gesture opens here
              // rather than at the movement-intent threshold below.
              beginSelectionGesture();
              selectAt(event.clientX, event.currentTarget);
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }}
          onPointerMove={(event) => {
            const pointer = pointerRef.current;
            if (!pointer || pointer.id !== event.pointerId) return;

            const dx = event.clientX - pointer.startX;
            const dy = event.clientY - pointer.startY;

            if (!pointer.scrubbing) {
              if (
                Math.abs(dy) >= INTENT_THRESHOLD_PX &&
                Math.abs(dy) > Math.abs(dx)
              ) {
                pointerRef.current = null;
                return;
              }
              if (
                Math.abs(dx) < INTENT_THRESHOLD_PX ||
                Math.abs(dx) < Math.abs(dy)
              ) {
                return;
              }
              pointer.scrubbing = true;
              // Prepare the Taptic Engine once, now that this is definitely a
              // scrub. Every date change until pointer-up is a bare tick.
              beginSelectionGesture();
              event.currentTarget.setPointerCapture(event.pointerId);
            }

            event.preventDefault();
            selectAt(event.clientX, event.currentTarget);
          }}
          onPointerUp={(event) => {
            if (pointerRef.current?.id !== event.pointerId) return;
            selectAt(event.clientX, event.currentTarget);
            endPointer(event.currentTarget, event.pointerId);
          }}
          onPointerCancel={(event) => {
            if (pointerRef.current?.id !== event.pointerId) return;
            endPointer(event.currentTarget, event.pointerId);
          }}
          onLostPointerCapture={() => {
            pointerRef.current = null;
          }}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            let nextIndex: number | null = null;
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              nextIndex = selectedIndex < 0 ? 0 : Math.min(uniqueDates.length - 1, selectedIndex + 1);
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              nextIndex =
                selectedIndex < 0
                  ? uniqueDates.length - 1
                  : Math.max(0, selectedIndex - 1);
            } else if (event.key === 'Home') {
              nextIndex = 0;
            } else if (event.key === 'End') {
              nextIndex = uniqueDates.length - 1;
            }

            if (nextIndex === null) return;
            event.preventDefault();
            const date = uniqueDates[nextIndex];
            if (date) onSelectDate(date);
          }}
        />
      )}
    </div>
  );
}
