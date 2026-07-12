import { Line } from 'recharts';
import { weeklySeriesProps, type SeriesLineProps } from '../../utils/chartStyle';

interface WeeklySegmentLinesProps {
  segmentKeys: string[];
  name: string;
  stroke: string;
  dotColor?: string;
  seriesProps?: Partial<SeriesLineProps>;
}

/** Renders one or more weekly line segments (gap-aware) on a daily-indexed chart. */
export function WeeklySegmentLines({
  segmentKeys,
  name,
  stroke,
  dotColor = stroke,
  seriesProps,
}: WeeklySegmentLinesProps) {
  const baseProps = { ...weeklySeriesProps(stroke, dotColor), ...seriesProps };

  if (segmentKeys.length === 0) {
    return null;
  }

  return (
    <>
      {segmentKeys.map((key, index) => (
        <Line
          key={key}
          dataKey={key}
          name={index === 0 ? name : undefined}
          stroke={stroke}
          legendType={index === 0 ? undefined : 'none'}
          {...baseProps}
        />
      ))}
    </>
  );
}
