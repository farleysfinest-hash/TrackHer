import { memo, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  ReferenceArea,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { MouseHandlerDataParam, ScatterPointItem } from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { LabPointReadout } from './ChartTooltipContent';
import { ChartReadoutDock } from './ChartReadoutDock';
import { LabTrendSelector } from './LabTrendSelector';
import { CHART_COLORS, formatChartDate, formatChartDateLong } from '../../utils/chartHelpers';
import { dateFromChartClick } from '../../utils/chartSelection';
import { getBiomarkerByKey } from '../../data/labRanges';
import { getTrendDirection, getValueStatus, type LabValueStatus } from '../../utils/labHelpers';
import {
  computeLabYDomain,
  formatLabChartValue,
  getReferenceLegendLine,
  referenceEdgeArea,
  resolveReferenceBands,
} from '../../utils/labChartHelpers';
import type { LabTrendPoint } from '../../hooks/useChartData';
import type { LabResult } from '../../types/database';
import type { LabBiomarker } from '../../types/labs';
import { daysBetweenISO } from '../../utils/localDate';

interface LabTrendChartProps {
  data: LabTrendPoint[];
  biomarkerKey: string;
  labResults: LabResult[];
  onBiomarkerChange: (key: string) => void;
}

const LAB_DOT_FILL = CHART_COLORS.mrsTotalDot;
const LAB_DOT_STROKE = 'var(--color-sand-50)';
const LAB_DOT_RADIUS = 6;
const LAB_VALUE_COLOR = CHART_COLORS.mrsTotal;

function formatDateSpan(start: string, end: string): string {
  const days = daysBetweenISO(start, end);
  if (days < 45) return `~${days} day${days !== 1 ? 's' : ''}`;
  const months = Math.round(days / 30);
  return months === 1 ? '~1 month' : `~${months} months`;
}

function statusRank(status: LabValueStatus | null): number {
  if (status === 'optimal') return 2;
  if (status === 'conventional') return 1;
  if (status === 'out_of_range') return 0;
  return -1;
}

function buildTrendSummary(data: LabTrendPoint[], unit: string, biomarker: LabBiomarker) {
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
  const movedTowardTarget =
    statusRank(getValueStatus(last.value, biomarker)) >
    statusRank(getValueStatus(first.value, biomarker));

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
    tone: movedTowardTarget ? ('toward' as const) : ('neutral' as const),
  };
}

function LabDrawDot(props: ScatterPointItem & { selectedDate?: string | null }) {
  const { cx, cy, payload, selectedDate } = props;
  if (cx == null || cy == null || !payload) return null;
  const point = payload as LabTrendPoint;
  const value = point.value;
  const selected = selectedDate != null && point.date === selectedDate;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={selected ? LAB_DOT_RADIUS + 1.5 : LAB_DOT_RADIUS}
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

function LabTrendBody({
  interactive,
  data,
  biomarker,
  yDomain,
  referenceContext,
  trendSummary,
  referenceLegend,
  toneClass,
}: {
  interactive: boolean;
  data: LabTrendPoint[];
  biomarker: LabBiomarker;
  yDomain: [number, number];
  referenceContext: ReturnType<typeof resolveReferenceBands>;
  trendSummary: ReturnType<typeof buildTrendSummary>;
  referenceLegend: string | null;
  toneClass: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!interactive) setSelectedDate(null);
  }, [interactive]);

  const dates = useMemo(() => data.map((row) => row.date), [data]);
  const labels = useMemo(() => data.map((row) => row.dateLabel), [data]);

  const selectedPoint = useMemo(
    () => (selectedDate ? data.find((row) => row.date === selectedDate) ?? null : null),
    [data, selectedDate],
  );

  const handleClick = (state: MouseHandlerDataParam) => {
    if (!interactive) return;
    const date = dateFromChartClick(state, dates, labels);
    if (date) setSelectedDate(date);
  };

  const chart = (
    <div className={interactive ? 'min-w-0 w-full' : 'min-w-0 w-full max-w-none sm:max-w-[440px]'}>
      <ResponsiveContainer width="100%" height={interactive ? 280 : 160}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 12, left: 0, bottom: 0 }}
          onClick={interactive ? handleClick : undefined}
        >
          {referenceContext.bands.map((band) => (
            <ReferenceArea
              key={band.label}
              y1={band.y1}
              y2={band.y2}
              fill={band.fill}
              fillOpacity={band.fillOpacity}
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
                fillOpacity={0.28}
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
          {interactive && (
            <Tooltip
              content={() => null}
              cursor={false}
              isAnimationActive={false}
              wrapperStyle={{ display: 'none' }}
            />
          )}
          <Scatter
            data={data}
            dataKey="value"
            fill={LAB_DOT_FILL}
            isAnimationActive={false}
            shape={(props: ScatterPointItem) => (
              <LabDrawDot {...props} selectedDate={interactive ? selectedDate : null} />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  const summary = (
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
      {referenceLegend && (
        <p className="mt-1.5 text-[11px] leading-snug text-sage-400">
          {referenceLegend}
        </p>
      )}
    </div>
  );

  const plot = (
    <div className="space-y-3">
      {summary}
      {chart}
      <p className="text-xs text-sage-400">
        Each dot is a blood draw. Levels between draws are not measured.
      </p>
    </div>
  );

  if (!interactive) return plot;

  const readout = selectedPoint
    ? LabPointReadout({
        point: selectedPoint,
        biomarkerLabel: biomarker.label,
        unit: biomarker.unit,
      })
    : null;

  return <ChartReadoutDock plot={plot} readout={readout} />;
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

  const trendSummary = biomarker ? buildTrendSummary(data, biomarker.unit, biomarker) : null;
  const referenceLegend = biomarker ? getReferenceLegendLine(biomarker) : null;

  if (!hasAnyLabData) return null;

  const toneClass = trendSummary?.tone === 'toward' ? 'text-moss-700' : 'text-sage-700';

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
      expandable
      expandedMinHeight="55vh"
    >
      {({ interactive }) =>
        !isEmpty && biomarker ? (
          <LabTrendBody
            interactive={interactive}
            data={data}
            biomarker={biomarker}
            yDomain={yDomain}
            referenceContext={referenceContext}
            trendSummary={trendSummary}
            referenceLegend={referenceLegend}
            toneClass={toneClass}
          />
        ) : null
      }
    </ChartCard>
  );
}

export const LabTrendChart = memo(LabTrendChartComponent);
