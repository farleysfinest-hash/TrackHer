import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  ReferenceArea,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { LabTooltipContent } from './ChartTooltipContent';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { getBiomarkerByKey } from '../../data/labRanges';
import type { LabTrendPoint } from '../../hooks/useChartData';

interface LabTrendChartProps {
  data: LabTrendPoint[];
  biomarkerKey: string;
}

function LabTrendChartComponent({ data, biomarkerKey }: LabTrendChartProps) {
  const biomarker = getBiomarkerByKey(biomarkerKey);
  const isEmpty = data.length < 2;

  const yDomain = useMemo(() => {
    if (data.length === 0) return [0, 100] as [number, number];
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const optMin = biomarker?.optimalRange?.min ?? min;
    const optMax = biomarker?.optimalRange?.max ?? max;
    const convMin = biomarker?.conventionalRange?.min ?? optMin;
    const convMax = biomarker?.conventionalRange?.max ?? optMax;
    const low = Math.min(min, convMin, optMin) * 0.9;
    const high = Math.max(max, convMax, optMax) * 1.1;
    return [Math.floor(low), Math.ceil(high)] as [number, number];
  }, [data, biomarker]);

  return (
    <ChartCard
      title={biomarker?.label ?? 'Lab Trend'}
      description={biomarker ? `Values in ${biomarker.unit}` : undefined}
      isEmpty={isEmpty}
      emptyState={{
        message: 'Add lab results from at least two blood draws to see trends here.',
        actionLabel: 'Add Labs',
        onAction: () => {
          window.location.href = '/labs';
        },
      }}
      minHeight="280px"
    >
      {!isEmpty && biomarker && (
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {biomarker.optimalRange && (
              <ReferenceArea
                y1={biomarker.optimalRange.min}
                y2={biomarker.optimalRange.max}
                fill={CHART_COLORS.optimalBand}
                fillOpacity={0.12}
              />
            )}
            {biomarker.conventionalRange &&
              (biomarker.conventionalRange.min !== biomarker.optimalRange?.min ||
                biomarker.conventionalRange.max !== biomarker.optimalRange?.max) && (
                <ReferenceArea
                  y1={biomarker.conventionalRange.min}
                  y2={biomarker.conventionalRange.max}
                  fill={CHART_COLORS.conventionalBand}
                  fillOpacity={0.08}
                />
              )}
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
              width={40}
            />
            <Tooltip
              content={
                <LabTooltipContent biomarkerLabel={biomarker.label} unit={biomarker.unit} />
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.mrsTotal}
              strokeWidth={2}
              dot={{ r: 5, fill: 'white', stroke: CHART_COLORS.mrsTotal, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export const LabTrendChart = memo(LabTrendChartComponent);
