import { ReferenceArea } from 'recharts';
import type { ObservationWindowRegion } from '../../utils/medicationHelpers';

/** Soft rose wash for observation windows — approved chart ink, not sage. */
const WINDOW_FILL = 'var(--color-chart-observation)';

interface ObservationWindowAreasProps {
  regions: ObservationWindowRegion[];
}

/** Renders beneath series (place early in the chart JSX). */
export function ObservationWindowAreas({ regions }: ObservationWindowAreasProps) {
  if (regions.length === 0) return null;

  return (
    <>
      {regions.map((region) => (
        <ReferenceArea
          key={region.id}
          x1={region.x1}
          x2={region.x2}
          fill={WINDOW_FILL}
          fillOpacity={0.35}
          strokeOpacity={0}
          ifOverflow="hidden"
        />
      ))}
    </>
  );
}
