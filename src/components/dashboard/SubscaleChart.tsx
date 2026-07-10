import { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { DotItemDotProps } from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { ChartTooltipContent } from './ChartTooltipContent';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { weeklySeriesProps } from '../../utils/chartStyle';
import {
  MRS_SUBSCALES,
  MRS_SUBSCALE_DESCRIPTION,
  type SubscaleMarkerShape,
} from '../../data/mrsSubscales';
import type { SymptomTrendPoint } from '../../hooks/useChartData';

interface SubscaleChartProps {
  data: SymptomTrendPoint[];
}

function SubscaleMarker({
  shape,
  fill,
  stroke,
  strokeWidth,
  radius,
  cx,
  cy,
}: {
  shape: SubscaleMarkerShape;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  cx: number;
  cy: number;
}) {
  if (shape === 'square') {
    return (
      <rect
        x={cx - radius}
        y={cy - radius}
        width={radius * 2}
        height={radius * 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (shape === 'diamond') {
    const r = radius;
    return (
      <polygon
        points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={radius} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function makeSubscaleDot(
  shape: SubscaleMarkerShape,
  fill: string,
  stroke: string,
  strokeWidth: number,
  radius: number,
) {
  return function SubscaleDot(props: DotItemDotProps) {
    const { cx, cy } = props;
    if (cx == null || cy == null) return null;
    return (
      <SubscaleMarker
        shape={shape}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        radius={radius}
        cx={cx}
        cy={cy}
      />
    );
  };
}

function SubscaleLegendMarker({
  shape,
  fill,
  stroke,
  strokeWidth,
  radius,
}: {
  shape: SubscaleMarkerShape;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}) {
  const size = radius * 2 + 2;
  return (
    <svg width={size} height={size} className="mt-1 shrink-0" aria-hidden>
      <SubscaleMarker
        shape={shape}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        radius={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  );
}

function SubscaleChartComponent({ data }: SubscaleChartProps) {
  const isEmpty = data.length < 2;

  return (
    <ChartCard
      title="MRS Subscale Breakdown"
      description={MRS_SUBSCALE_DESCRIPTION}
      isEmpty={isEmpty}
      emptyState={{ message: 'Need at least 2 check-ins to show subscale trends.' }}
      minHeight="280px"
    >
      {!isEmpty && (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
              <YAxis domain={[0, 16]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} width={28} />
              <Tooltip content={<ChartTooltipContent />} />
              {MRS_SUBSCALES.map((subscale) => {
                const base = weeklySeriesProps(subscale.color, subscale.dotFill);
                return (
                  <Line
                    key={subscale.dataKey}
                    dataKey={subscale.dataKey}
                    name={subscale.plainLabel}
                    stroke={subscale.color}
                    {...base}
                    dot={
                      makeSubscaleDot(
                        subscale.markerShape,
                        subscale.dotFill,
                        subscale.dotStroke,
                        subscale.dotStrokeWidth,
                        subscale.dotRadius,
                      ) as never
                    }
                    activeDot={
                      makeSubscaleDot(
                        subscale.markerShape,
                        subscale.dotFill,
                        subscale.dotStroke,
                        subscale.dotStrokeWidth,
                        subscale.dotRadius + 0.5,
                      ) as never
                    }
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {MRS_SUBSCALES.map((subscale) => (
              <div key={subscale.dataKey} className="flex items-start gap-2">
                <SubscaleLegendMarker
                  shape={subscale.markerShape}
                  fill={subscale.dotFill}
                  stroke={subscale.dotStroke}
                  strokeWidth={subscale.dotStrokeWidth}
                  radius={subscale.dotRadius}
                />
                <div>
                  <p className="text-xs font-medium text-sage-700">{subscale.plainLabel}</p>
                  <p className="text-[10px] text-sage-400">({subscale.clinicalLabel})</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}

export const SubscaleChart = memo(SubscaleChartComponent);
