import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { ChartTooltipContent } from './ChartTooltipContent';
import { CHART_COLORS } from '../../utils/chartHelpers';
import type { SymptomTrendPoint, ChangeMarker } from '../../hooks/useChartData';

interface OverlayChartProps {
  data: SymptomTrendPoint[];
  changeMarkers: ChangeMarker[];
}

function OverlayChartComponent({ data, changeMarkers }: OverlayChartProps) {
  const isEmpty = data.length < 2;

  const chartData = useMemo(() => data.map((d) => ({ ...d, checkin: d.checkin })), [data]);

  return (
    <ChartCard
      title="Symptom & Medication Overview"
      description="MRS score and wellbeing over time, with medication changes marked"
      isEmpty={isEmpty}
      emptyState={{
        message: 'Check in at least twice to see your symptom trends here.',
        actionLabel: 'Go to Check In',
        onAction: () => {
          window.location.href = '/checkin';
        },
      }}
      minHeight="320px"
    >
      {!isEmpty && (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
            <YAxis
              yAxisId="mrs"
              domain={[0, 64]}
              tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
              width={36}
            />
            <YAxis
              yAxisId="wellbeing"
              orientation="right"
              domain={[1, 10]}
              tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
              width={28}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Area
              yAxisId="mrs"
              type="monotone"
              dataKey="mrsTotal"
              fill={CHART_COLORS.mrsTotal}
              fillOpacity={0.12}
              stroke={CHART_COLORS.mrsTotal}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              yAxisId="wellbeing"
              type="monotone"
              dataKey="wellbeing"
              stroke={CHART_COLORS.wellbeing}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: CHART_COLORS.wellbeing }}
              connectNulls
              isAnimationActive={false}
            />
            {changeMarkers.map((marker) => (
              <ReferenceLine
                key={marker.id}
                yAxisId="mrs"
                x={marker.dateLabel}
                stroke={CHART_COLORS.changeLine}
                strokeDasharray="4 4"
                label={{
                  value: marker.label,
                  position: 'top',
                  fontSize: 10,
                  fill: CHART_COLORS.axisText,
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export const OverlayChart = memo(OverlayChartComponent);
