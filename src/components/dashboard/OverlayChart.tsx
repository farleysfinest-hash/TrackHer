import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
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
      description="MRS score and daily energy over time, with medication changes marked"
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
        <>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
              <YAxis
                yAxisId="mrs"
                domain={[0, 44]}
                tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
                width={36}
              />
              <YAxis
                yAxisId="wellbeing"
                orientation="right"
                domain={[1, 5]}
                tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
                width={28}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId="mrs"
                type="linear"
                dataKey="mrsTotal"
                stroke={CHART_COLORS.mrsTotal}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 4, fill: CHART_COLORS.mrsTotal, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId="wellbeing"
                type="monotone"
                dataKey="wellbeing"
                stroke={CHART_COLORS.wellbeing}
                strokeWidth={1.5}
                strokeOpacity={0.75}
                dot={false}
                activeDot={{ r: 3, fill: CHART_COLORS.wellbeing }}
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

          <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-sage-600">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-2 w-4 items-center"
                aria-hidden
              >
                <span
                  className="h-0 w-full border-t-2 border-dashed"
                  style={{ borderColor: CHART_COLORS.mrsTotal }}
                />
                <span
                  className="ml-[-2px] h-2 w-2 rounded-full"
                  style={{ backgroundColor: CHART_COLORS.mrsTotal }}
                />
              </span>
              <span>MRS Score (0–44)</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-4"
                style={{ backgroundColor: CHART_COLORS.wellbeing, opacity: 0.75 }}
                aria-hidden
              />
              <span>Energy (1–5)</span>
            </div>
          </div>
        </>
      )}
    </ChartCard>
  );
}

export const OverlayChart = memo(OverlayChartComponent);
