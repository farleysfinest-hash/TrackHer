import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { ChartTooltipContent } from './ChartTooltipContent';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { dailySeriesProps, rollingAverageCentered3, weeklySeriesProps } from '../../utils/chartStyle';
import type { SymptomTrendPoint } from '../../hooks/useChartData';

interface SymptomTrendChartProps {
  data: SymptomTrendPoint[];
}

export function SymptomTrendChart({ data }: SymptomTrendChartProps) {
  const isEmpty = data.length < 2;

  const chartData = useMemo(() => {
    const smoothedEnergy = rollingAverageCentered3(data.map((d) => d.wellbeing));
    return data.map((row, i) => ({
      ...row,
      wellbeingSmoothed: smoothedEnergy[i],
    }));
  }, [data]);

  const mrsStyle = weeklySeriesProps(CHART_COLORS.mrsTotal, CHART_COLORS.mrsTotalDot);
  const energyStyle = dailySeriesProps(CHART_COLORS.wellbeing);

  return (
    <ChartCard
      title="Symptom Trends"
      description="MRS total score and daily energy over time"
      isEmpty={isEmpty}
      emptyState={{ message: 'Check in at least twice to see symptom trends.' }}
      minHeight="280px"
    >
      {!isEmpty && (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
            <YAxis yAxisId="mrs" domain={[0, 44]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} width={36} />
            <YAxis
              yAxisId="wb"
              orientation="right"
              domain={[1, 5]}
              tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
              width={28}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="mrs"
              dataKey="mrsTotal"
              name="MRS Score"
              stroke={CHART_COLORS.mrsTotal}
              {...mrsStyle}
            />
            <Line
              yAxisId="wb"
              dataKey="wellbeingSmoothed"
              name="Energy"
              stroke={CHART_COLORS.wellbeing}
              {...energyStyle}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
