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
import { LabTrendSelector } from './LabTrendSelector';
import { CHART_COLORS, formatChartDate, formatChartDateLong } from '../../utils/chartHelpers';
import { getBiomarkerByKey } from '../../data/labRanges';
import { getTrendDirection } from '../../utils/labHelpers';
import type { LabTrendPoint } from '../../hooks/useChartData';
import type { LabResult } from '../../types/database';

interface LabTrendChartProps {
  data: LabTrendPoint[];
  biomarkerKey: string;
  labResults: LabResult[];
  onBiomarkerChange: (key: string) => void;
}

function formatDateSpan(start: string, end: string): string {
  const days = Math.round(
    (new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (days < 45) return `~${days} day${days !== 1 ? 's' : ''}`;
  const months = Math.round(days / 30);
  return months === 1 ? '~1 month' : `~${months} months`;
}

function buildTrendSummary(data: LabTrendPoint[], unit: string) {
  if (data.length === 1) {
    const point = data[0];
    return {
      headline: `${point.value} ${unit}`,
      detail: `${formatChartDateLong(point.date)} · Add another draw to compare trend`,
      tone: 'neutral' as const,
    };
  }

  if (data.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];
  const diff = last.value - first.value;
  const direction = getTrendDirection(last.value, first.value);
  const span = formatDateSpan(first.date, last.date);

  if (direction === 'flat' || diff === 0) {
    return {
      headline: `→ No change · ${last.value} ${unit}`,
      detail: `${formatChartDate(first.date)} – ${formatChartDate(last.date)} (${span})`,
      tone: 'neutral' as const,
    };
  }

  const arrow = direction === 'up' ? '↑' : '↓';
  const signedDiff = diff > 0 ? `+${diff}` : `${diff}`;

  return {
    headline: `${arrow} ${signedDiff} ${unit}`,
    detail: `${first.value} → ${last.value} over ${span} (${formatChartDate(first.date)} – ${formatChartDate(last.date)})`,
    tone: direction === 'up' ? ('up' as const) : ('down' as const),
  };
}

function LabTrendChartComponent({
  data,
  biomarkerKey,
  labResults,
  onBiomarkerChange,
}: LabTrendChartProps) {
  const biomarker = getBiomarkerByKey(biomarkerKey);
  const hasAnyLabData = labResults.length > 0;
  const isEmpty = data.length === 0;

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

  const trendSummary = biomarker ? buildTrendSummary(data, biomarker.unit) : null;

  if (!hasAnyLabData) return null;

  const toneClass =
    trendSummary?.tone === 'up'
      ? 'text-success'
      : trendSummary?.tone === 'down'
        ? 'text-danger'
        : 'text-sage-700';

  return (
    <ChartCard
      title="Lab trends"
      description="Compare results across blood draws"
      actions={
        <LabTrendSelector
          labResults={labResults}
          selectedKey={biomarkerKey}
          onChange={onBiomarkerChange}
        />
      }
      isEmpty={isEmpty}
      emptyState={{
        message:
          'No results for this biomarker in the selected date range. Try a wider range or add lab results.',
        actionLabel: 'Add Labs',
        onAction: () => {
          window.location.href = '/labs';
        },
      }}
      minHeight="280px"
    >
      {!isEmpty && biomarker && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-sage-600">
              {biomarker.label} · {biomarker.unit}
            </p>
            {trendSummary && (
              <div className="mt-1">
                <p className={`font-display text-xl font-semibold ${toneClass}`}>
                  {trendSummary.headline}
                </p>
                <p className="mt-0.5 text-sm text-sage-500">{trendSummary.detail}</p>
              </div>
            )}
          </div>

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
                stroke="transparent"
                strokeWidth={0}
                dot={{
                  r: 6,
                  fill: CHART_COLORS.mrsTotal,
                  stroke: 'white',
                  strokeWidth: 2,
                }}
                activeDot={{ r: 7, stroke: CHART_COLORS.mrsTotal, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <p className="text-xs text-sage-400">
            Each dot is a blood draw. Levels between draws are not measured.
          </p>
        </div>
      )}
    </ChartCard>
  );
}

export const LabTrendChart = memo(LabTrendChartComponent);
