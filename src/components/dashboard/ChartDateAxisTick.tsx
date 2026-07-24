import { CHART_COLORS } from '../../utils/chartHelpers';

interface ChartDateAxisTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string | number };
  index?: number;
  visibleTicksCount?: number;
}

/**
 * Start- and end-anchored date ticks so the first and last labels are not clipped
 * at the chart edges (Recharts centers ticks by default).
 */
export function ChartDateAxisTick({
  x = 0,
  y = 0,
  payload,
  index = 0,
  visibleTicksCount,
}: ChartDateAxisTickProps) {
  const value = payload?.value;
  if (value == null || value === '') return null;

  const isFirst = index === 0;
  const isLast = visibleTicksCount != null && index === visibleTicksCount - 1;
  const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle';

  return (
    <text
      x={Number(x)}
      y={Number(y)}
      dy={12}
      textAnchor={textAnchor}
      fill={CHART_COLORS.axisText}
      fontSize={11}
    >
      {String(value)}
    </text>
  );
}
