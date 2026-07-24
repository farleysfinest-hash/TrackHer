import { memo } from 'react';
import { formatChartDate } from '../../utils/chartHelpers';
import {
  boundaryLabelTranslateX,
  LANE_BOUNDARY_LABEL_CLEARANCE_PX,
  type DoseChangeMarkerPercent,
  type MedicationLaneRow,
} from '../../utils/medicationLaneHelpers';
import { BandDoseMarkerOverlay } from './SymptomBand';

interface MedicationLaneProps {
  rows: MedicationLaneRow[];
  markers?: DoseChangeMarkerPercent[];
}

function MedicationLaneComponent({ rows, markers }: MedicationLaneProps) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-0.5 space-y-1 pb-1 pt-0">
      {rows.map((row) => {
        const rowMarkers =
          markers?.filter((marker) => marker.medicationId === row.medicationId) ?? [];
        const hasBoundaries = row.boundaries.length > 0;

        return (
          <div
            key={row.medicationId}
            className="space-y-0.5"
            data-medication-id={row.medicationId}
            style={{
              // Keep dose-change labels inside this med's row so they cannot
              // collide with another medication's name or bar.
              paddingBottom: hasBoundaries ? LANE_BOUNDARY_LABEL_CLEARANCE_PX : 0,
            }}
          >
            <p
              className="truncate text-[9px] text-sage-500 md:hidden"
              title={row.rowLabel}
            >
              {row.medicationName}
            </p>
            <p
              className="hidden truncate text-[9px] text-sage-500 md:block"
              title={row.rowLabel}
            >
              {row.rowLabel}
            </p>
            <div className="relative h-[10px] rounded-[3px] bg-sand-50/50">
              {rowMarkers.length > 0 && (
                <BandDoseMarkerOverlay
                  markers={rowMarkers}
                  height={10}
                  insetLeft={0}
                  insetRight={0}
                />
              )}
              {row.segments.map((segment) => (
                <div
                  key={segment.id}
                  className="absolute top-0 h-[10px] rounded-[3px]"
                  style={{
                    left: `${segment.leftPercent}%`,
                    width: `${segment.widthPercent}%`,
                    backgroundColor: segment.color,
                    opacity: 0.92,
                  }}
                  aria-label={`${row.medicationName}, ${segment.doseLabel}, ${formatChartDate(segment.startDate)} to ${formatChartDate(segment.endDate)}`}
                />
              ))}
              {row.boundaries.map((boundary) => (
                <span
                  key={boundary.id}
                  data-medication-id={boundary.medicationId}
                  className="pointer-events-none absolute top-full mt-1 max-w-[9rem] whitespace-nowrap text-[8px] leading-tight text-sage-500"
                  style={{
                    left: `${boundary.leftPercent}%`,
                    transform: `translateX(${boundaryLabelTranslateX(boundary.leftPercent)}%)`,
                  }}
                  title={boundary.label}
                >
                  {boundary.label}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const MedicationLane = memo(MedicationLaneComponent);
