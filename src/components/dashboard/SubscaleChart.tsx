import { memo } from 'react';
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

interface SubscaleChartProps {
  data: SymptomTrendPoint[];
}

function SubscaleChartComponent({ data }: SubscaleChartProps) {
  const isEmpty = data.length < 2;

  return (
    <ChartCard
      title="MRS Subscale Breakdown"
      description="Vasomotor, psychological, and urogenital scores over time"
      isEmpty={isEmpty}
      emptyState={{ message: 'Need at least 2 check-ins to show subscale trends.' }}
      minHeight="280px"
    >
      {!isEmpty && (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
            <YAxis domain={[0, 20]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} width={28} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="somatic"
              name="Vasomotor"
              stroke={CHART_COLORS.somatic}
              strokeWidth={2}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="psychological"
              name="Psychological"
              stroke={CHART_COLORS.psychological}
              strokeWidth={2}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="urogenital"
              name="Urogenital"
              stroke={CHART_COLORS.urogenital}
              strokeWidth={2}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export const SubscaleChart = memo(SubscaleChartComponent);
