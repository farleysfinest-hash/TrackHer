import { memo, useCallback, useState } from 'react';
import { formatChartDate, formatChartDateLong } from '../../utils/chartHelpers';
import type { MedicationLaneRow, MedicationLaneSegment } from '../../utils/medicationLaneHelpers';

interface LaneTooltipState {
  row: MedicationLaneRow;
  segment: MedicationLaneSegment;
  x: number;
  y: number;
}

interface MedicationLaneProps {
  rows: MedicationLaneRow[];
}

function LaneTooltip({ state }: { state: LaneTooltipState }) {
  const { row, segment } = state;
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: state.x, top: state.y, transform: 'translate(-50%, -110%)' }}
    >
      <p className="font-medium text-sage-800">{row.medicationName}</p>
      <p className="text-sage-700">{segment.doseLabel}</p>
      <p className="text-sage-500">
        {formatChartDateLong(segment.startDate)} – {formatChartDateLong(segment.endDate)}
      </p>
    </div>
  );
}

function MedicationLaneComponent({ rows }: MedicationLaneProps) {
  const [tooltip, setTooltip] = useState<LaneTooltipState | null>(null);

  const showTooltip = useCallback(
    (row: MedicationLaneRow, segment: MedicationLaneSegment, el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      setTooltip({
        row,
        segment,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    [],
  );

  const hideTooltip = useCallback(() => setTooltip(null), []);

  if (rows.length === 0) return null;

  return (
    <>
      <div className="mt-0.5 space-y-1 pb-1 pt-0">
        {rows.map((row) => (
          <div key={row.medicationId} className="space-y-0.5">
            <p className="truncate text-[9px] text-sage-500">{row.rowLabel}</p>
            <div className="relative h-[10px] rounded-[3px] bg-sand-50/50">
              {row.segments.map((segment) => (
                <button
                  key={segment.id}
                  type="button"
                  className="absolute top-0 h-[10px] rounded-[3px] transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                  style={{
                    left: `${segment.leftPercent}%`,
                    width: `${segment.widthPercent}%`,
                    backgroundColor: segment.color,
                    opacity: 0.92,
                  }}
                  onMouseEnter={(e) => showTooltip(row, segment, e.currentTarget)}
                  onMouseLeave={hideTooltip}
                  onFocus={(e) => showTooltip(row, segment, e.currentTarget)}
                  onBlur={hideTooltip}
                  onClick={(e) => showTooltip(row, segment, e.currentTarget)}
                  aria-label={`${row.medicationName}, ${segment.doseLabel}, ${formatChartDate(segment.startDate)} to ${formatChartDate(segment.endDate)}`}
                />
              ))}
              {row.boundaries.map((boundary) => (
                <span
                  key={boundary.id}
                  className="pointer-events-none absolute top-full mt-1 max-w-[7rem] -translate-x-1/2 truncate whitespace-nowrap text-[8px] leading-tight text-sage-500"
                  style={{ left: `${boundary.leftPercent}%` }}
                >
                  {boundary.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {tooltip && <LaneTooltip state={tooltip} />}
    </>
  );
}

export const MedicationLane = memo(MedicationLaneComponent);
