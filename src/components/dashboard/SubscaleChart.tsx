import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { ChartTooltipContent } from './ChartTooltipContent';
import { WeeklySegmentLines } from './WeeklySegmentLines';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { weeklySeriesProps } from '../../utils/chartStyle';
import { buildDailyIndexedWeeklyChart, weeklyChartWindow } from '../../utils/weeklyChartSeries';
import { MRS_SUBSCALES, MRS_SUBSCALE_DESCRIPTION } from '../../data/mrsSubscales';
import type { SymptomTrendPoint } from '../../hooks/useChartData';

interface SubscaleChartProps {
  data: SymptomTrendPoint[];
}

function subscaleSeriesProps(
  color: string,
  dotFill: string,
  dotStroke: string,
  dotStrokeWidth: number,
) {
  const base = weeklySeriesProps(color, dotFill);
  if (dotStrokeWidth <= 0) return base;
  return {
    ...base,
    dot: { r: 4, fill: dotFill, stroke: dotStroke, strokeWidth: dotStrokeWidth },
    activeDot: { r: 5, fill: dotFill, stroke: '#ffffff', strokeWidth: 1 },
  };
}

const SUBSCALE_VALUE_KEYS = MRS_SUBSCALES.map((s) => s.dataKey);

function SubscaleChartComponent({ data }: SubscaleChartProps) {
  const isEmpty = data.length < 2;

  const { dailyRows, weeklySegmentKeys } = useMemo(() => {
    if (data.length < 2) {
      return { dailyRows: [], weeklySegmentKeys: {} as Record<string, string[]> };
    }
    const dates = data.map((d) => d.date);
    const window = weeklyChartWindow(dates, dates[0], dates[dates.length - 1]);
    return buildDailyIndexedWeeklyChart(data, window.start, window.end, SUBSCALE_VALUE_KEYS);
  }, [data]);

  return (
    <ChartCard
      title="MRS Subscale Breakdown"
      description={MRS_SUBSCALE_DESCRIPTION}
      isEmpty={isEmpty}
      emptyState={{ message: 'Need at least 2 check-ins to show subscale trends.' }}
      minHeight="280px"
    >
      {!isEmpty && (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
            <YAxis domain={[0, 16]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} width={28} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {MRS_SUBSCALES.map((subscale) => (
              <WeeklySegmentLines
                key={subscale.dataKey}
                segmentKeys={weeklySegmentKeys[subscale.dataKey] ?? []}
                name={subscale.plainLabel}
                stroke={subscale.color}
                dotColor={subscale.dotFill}
                seriesProps={subscaleSeriesProps(
                  subscale.color,
                  subscale.dotFill,
                  subscale.dotStroke,
                  subscale.dotStrokeWidth,
                )}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export const SubscaleChart = memo(SubscaleChartComponent);
