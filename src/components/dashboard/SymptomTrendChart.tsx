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
import type { SymptomTrendPoint } from '../../hooks/useChartData';

interface SymptomTrendChartProps {
  data: SymptomTrendPoint[];
}

export function SymptomTrendChart({ data }: SymptomTrendChartProps) {
  const isEmpty = data.length < 2;

  return (
    <ChartCard
      title="Symptom Trends"
      description="MRS total score and wellbeing over time"
      isEmpty={isEmpty}
      emptyState={{ message: 'Check in at least twice to see symptom trends.' }}
      minHeight="280px"
    >
      {!isEmpty && (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
            <YAxis yAxisId="mrs" domain={[0, 64]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} width={36} />
            <YAxis
              yAxisId="wb"
              orientation="right"
              domain={[1, 10]}
              tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
              width={28}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="mrs"
              type="monotone"
              dataKey="mrsTotal"
              name="MRS Score"
              stroke={CHART_COLORS.mrsTotal}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="wb"
              type="monotone"
              dataKey="wellbeing"
              name="Wellbeing"
              stroke={CHART_COLORS.wellbeing}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
