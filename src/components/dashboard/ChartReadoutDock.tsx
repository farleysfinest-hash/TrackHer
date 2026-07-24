import type { ReactNode } from 'react';
import { useLandscape } from '../../hooks/useLandscape';

interface ChartReadoutDockProps {
  /** The plot (and any chrome that stays with it). */
  plot: ReactNode;
  /** Selected-date readout. Null/undefined = nothing docked. */
  readout?: ReactNode | null;
}

/**
 * Docks a selected-date readout outside the plot:
 * - portrait → below
 * - landscape → beside
 * Never floats over the chart.
 */
export function ChartReadoutDock({ plot, readout }: ChartReadoutDockProps) {
  const landscape = useLandscape();
  const show = readout != null;

  return (
    <div
      className={[
        'flex min-w-0 gap-3',
        show && landscape ? 'flex-row items-start' : 'flex-col',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">{plot}</div>
      {show && (
        <aside
          className={[
            'min-w-0 overflow-hidden break-words',
            landscape
              ? 'w-[min(11.5rem,34%)] shrink-0 max-h-[min(70vh,28rem)] overflow-y-auto'
              : 'w-full',
          ].join(' ')}
        >
          {readout}
        </aside>
      )}
    </div>
  );
}
