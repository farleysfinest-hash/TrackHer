import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  ReferenceArea,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { ScatterPointItem } from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { LabTooltipContent } from './ChartTooltipContent';
import { LabTrendSelector } from './LabTrendSelector';
import { CHART_COLORS, formatChartDate, formatChartDateLong } from '../../utils/chartHelpers';
import { getBiomarkerByKey } from '../../data/labRanges';
import { getTrendDirection } from '../../utils/labHelpers';
import {
  computeLabYDomain,
  formatLabChartValue,
  referenceEdgeArea,
  resolveReferenceBands,
} from '../../utils/labChartHelpers';
import type { LabTrendPoint } from '../../hooks/useChartData';
import type { LabResult } from '../../types/database';

interface LabTrendChartProps {
  data: LabTrendPoint[];
  biomarkerKey: string;
  labResults: LabResult[];
  onBiomarkerChange: (key: string) => void;
}

const LAB_DOT_FILL = CHART_COLORS.mrsTotalDot;
const LAB_DOT_STROKE = '#ffffff';
const LAB_DOT_RADIUS = 6;
const LAB_VALUE_COLOR = CHART_COLORS.mrsTotal;

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
      headline: `${formatLabChartValue(point.value)} ${unit}`,
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
      headline: `→ No change · ${formatLabChartValue(last.value)} ${unit}`,
      detail: `${formatChartDate(first.date)} – ${formatChartDate(last.date)} (${span})`,
      tone: 'neutral' as const,
    };
  }

  const arrow = direction === 'up' ? '↑' : '↓';
  const signedDiff =
    diff > 0 ? `+${formatLabChartValue(diff)}` : formatLabChartValue(diff);

  return {
    headline: `${arrow} ${signedDiff} ${unit}`,
    detail: `${formatLabChartValue(first.value)} → ${formatLabChartValue(last.value)} over ${span} (${formatChartDate(first.date)} – ${formatChartDate(last.date)})`,
    tone: direction === 'up' ? ('up' as const) : ('down' as const),
  };
}

function LabDrawDot(props: ScatterPointItem) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const value = (payload as LabTrendPoint).value;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={LAB_DOT_RADIUS}
        fill={LAB_DOT_FILL}
        stroke={LAB_DOT_STROKE}
        strokeWidth={2}
      />
      <text
        x={cx}
        y={cy - LAB_DOT_RADIUS - 6}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={LAB_VALUE_COLOR}
      >
        {formatLabChartValue(value)}
      </text>
    </g>
  );
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
    const domain = computeLabYDomain(data.map((d) => d.value));
    return [domain.min, domain.max] as [number, number];
  }, [data]);

  const referenceContext = useMemo(() => {
    if (!biomarker) return { bands: [], edges: [] };
    const domain = { min: yDomain[0], max: yDomain[1] };
    return resolveReferenceBands(biomarker, domain, {
      conventional: CHART_COLORS.conventionalBand,
      optimal: CHART_COLORS.optimalBand,
    });
  }, [biomarker, yDomain]);

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
            <ComposedChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
              {referenceContext.bands.map((band) => (
                <ReferenceArea
                  key={band.label}
                  y1={band.y1}
                  y2={band.y2}
                  fill={band.fill}
                  fillOpacity={band.fillOpacity}
                  label={{
                    value: band.label,
                    position: 'insideTopLeft',
                    fontSize: 10,
                    fill: CHART_COLORS.axisText,
                  }}
                />
              ))}
              {referenceContext.edges.map((edge) => {
                const area = referenceEdgeArea(edge.edge, { min: yDomain[0], max: yDomain[1] });
                return (
                  <ReferenceArea
                    key={edge.label}
                    y1={area.y1}
                    y2={area.y2}
                    fill={edge.fill}
                    fillOpacity={0.22}
                    label={{
                      value: edge.label,
                      position: edge.edge === 'top' ? 'insideTopRight' : 'insideBottomRight',
                      fontSize: 10,
                      fill: CHART_COLORS.axisText,
                    }}
                  />
                );
              })}
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
                width={44}
                tickFormatter={(v) => formatLabChartValue(Number(v))}
              />
              <Tooltip
                content={
                  <LabTooltipContent biomarkerLabel={biomarker.label} unit={biomarker.unit} />
                }
              />
              <Scatter
                data={data}
                dataKey="value"
                fill={LAB_DOT_FILL}
                isAnimationActive={false}
                shape={LabDrawDot}
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
