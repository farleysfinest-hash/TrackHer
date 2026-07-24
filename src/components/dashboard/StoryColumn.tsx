import { memo, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { MouseHandlerDataParam } from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { ChartReadoutDock } from './ChartReadoutDock';
import { StoryPointReadout } from './ChartTooltipContent';
import { MedicationLane } from './MedicationLane';
import { ObservationWindowAreas } from './ObservationWindowAreas';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { dateFromChartClick } from '../../utils/chartSelection';
import { buildDailyIndexedWeeklyChart } from '../../utils/weeklyChartSeries';
import { WeeklySegmentLines } from './WeeklySegmentLines';
import {
  buildMedicationLaneRows,
  doseChangeMarkerPercents,
  medicationLaneBlockHeight,
  CHART_MARGIN_LEFT,
  CHART_MARGIN_RIGHT,
} from '../../utils/medicationLaneHelpers';
import { observationWindowRegions } from '../../utils/medicationHelpers';
import {
  getPulseChannelValue,
  PULSE_CHANNELS,
  resolvePulsePanelDefaults,
  type PulseChannel,
} from '../../utils/storyColumnHelpers';
import type { SymptomTrendPoint } from '../../hooks/useChartData';
import type { Medication, MedicationChange } from '../../types/database';
import type { Insight } from '../../engine/types';
import { ChartDateAxisTick } from './ChartDateAxisTick';

const PANEL_MRS_HEIGHT = 80;
const PANEL_PULSE_HEIGHT = 64;
const PANEL_MRS_HEIGHT_EXPANDED = 180;
const PANEL_PULSE_HEIGHT_EXPANDED = 140;
const X_AXIS_HEIGHT = 28;

const INK = {
  mrsStroke: 'var(--color-chart-line-primary)',
  mrsDot: 'var(--color-chart-dot)',
  pulse: 'var(--color-chart-pulse)',
  rule: 'var(--color-chart-marker)',
} as const;

const CHART_MARGIN = {
  top: 4,
  right: CHART_MARGIN_RIGHT,
  left: CHART_MARGIN_LEFT,
  bottom: 0,
} as const;

/** Hit-test only — never visible over the plot. */
function HiddenTooltip() {
  return (
    <Tooltip
      content={() => null}
      cursor={false}
      isAnimationActive={false}
      wrapperStyle={{ display: 'none' }}
    />
  );
}

interface StoryColumnProps {
  data: SymptomTrendPoint[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  windowStart: string;
  windowEnd: string;
  insights: Insight[];
}

type StoryChartRow = ReturnType<typeof buildDailyIndexedWeeklyChart>['dailyRows'][number] & {
  pulseRaw?: number | null;
  checkin?: SymptomTrendPoint['checkin'];
  mrsTotal?: number | null;
  gapNotice?: string;
};

const PULSE_AXIS_LABELS: Record<PulseChannel, { high: string; low: string }> = {
  energy: { high: 'Energized', low: 'Drained' },
  mood: { high: 'Great', low: 'Rough' },
  sleep: { high: 'Great', low: 'Rough' },
};

interface PulseAxisTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: number };
  channel: PulseChannel;
}

function PulseAxisTick({ x = 0, y = 0, payload, channel }: PulseAxisTickProps) {
  const labels = PULSE_AXIS_LABELS[channel];
  const value = payload?.value;
  const text = value === 5 ? labels.high : value === 1 ? labels.low : '';
  if (!text) return null;

  return (
    <text x={Number(x)} y={Number(y)} dy={4} textAnchor="end" fill="var(--color-chart-axis)" fontSize={9} dx={-4}>
      {text}
    </text>
  );
}

interface StoryChartsBodyProps {
  chartData: StoryChartRow[];
  mrsSegmentKeys: string[];
  activeChannel: PulseChannel;
  pulseHeader: string;
  onPulseChannel: (id: PulseChannel) => void;
  laneRows: ReturnType<typeof buildMedicationLaneRows>;
  markerLines: ReturnType<typeof doseChangeMarkerPercents>;
  windowRegions: ReturnType<typeof observationWindowRegions>;
  mrsHeight: number;
  pulseHeight: number;
  interactive: boolean;
}

function StoryChartsBody({
  chartData,
  mrsSegmentKeys,
  activeChannel,
  pulseHeader,
  onPulseChannel,
  laneRows,
  markerLines,
  windowRegions,
  mrsHeight,
  pulseHeight,
  interactive,
}: StoryChartsBodyProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!interactive) setSelectedDate(null);
  }, [interactive]);

  const dates = useMemo(() => chartData.map((row) => row.date), [chartData]);

  const selectedPoint = useMemo(() => {
    if (!selectedDate) return null;
    return chartData.find((row) => row.date === selectedDate) ?? null;
  }, [chartData, selectedDate]);

  const laneHeight = medicationLaneBlockHeight(laneRows);
  const mrsTicks = [0, 22, 44];

  const handleChartClick = (state: MouseHandlerDataParam) => {
    if (!interactive) return;
    const date = dateFromChartClick(state, dates);
    if (date) setSelectedDate(date);
  };

  const mrsDot = (props: { cx?: number; cy?: number; payload?: StoryChartRow }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const selected = interactive && payload?.date === selectedDate;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={selected ? 5 : 3.5}
        fill="var(--color-chart-dot)"
        stroke="var(--color-chart-dot)"
        strokeWidth={0}
      />
    );
  };

  const plot = (
    <div>
      <p className="mb-1 text-[10px] text-sage-500">MRS score · weekly · 0–44</p>

      <div className="relative">
        <ResponsiveContainer width="100%" height={mrsHeight}>
          <LineChart
            data={chartData}
            margin={CHART_MARGIN}
            onClick={interactive ? handleChartClick : undefined}
          >
            <XAxis dataKey="date" hide />
            <ObservationWindowAreas regions={windowRegions} />
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <YAxis
              domain={[0, 44]}
              ticks={mrsTicks}
              tick={{ fontSize: 10, fill: CHART_COLORS.axisText }}
              width={CHART_MARGIN_LEFT}
              axisLine={false}
              tickLine={false}
            />
            {interactive && <HiddenTooltip />}
            <WeeklySegmentLines
              segmentKeys={mrsSegmentKeys}
              name="MRS Score"
              stroke={INK.mrsStroke}
              dotColor={INK.mrsDot}
              seriesProps={{
                strokeWidth: 2,
                dot: mrsDot,
                activeDot: false,
              }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-1">
          <div className="mb-1 flex flex-col gap-1.5 md:flex-row md:items-start md:justify-between md:gap-2">
            <p className="min-w-0 text-[10px] leading-snug text-sage-500 md:flex-1">
              {pulseHeader}
            </p>
            <div className="flex flex-wrap gap-1.5 md:shrink-0 md:justify-end">
              {PULSE_CHANNELS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onPulseChannel(chip.id)}
                  className={[
                    'rounded-2xl px-2.5 py-1 text-[10px] font-medium transition-colors',
                    activeChannel === chip.id
                      ? 'bg-sage-500 text-on-accent'
                      : 'border border-sand-200 text-sage-600 hover:bg-sage-50',
                  ].join(' ')}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={pulseHeight}>
            <AreaChart
              data={chartData}
              margin={CHART_MARGIN}
              onClick={interactive ? handleChartClick : undefined}
            >
              <XAxis dataKey="date" hide />
              <ObservationWindowAreas regions={windowRegions} />
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 5]}
                tick={(props) => <PulseAxisTick {...props} channel={activeChannel} />}
                width={CHART_MARGIN_LEFT}
                axisLine={false}
                tickLine={false}
              />
              {interactive && <HiddenTooltip />}
              <Area
                dataKey="pulseRaw"
                type="monotone"
                stroke={INK.pulse}
                strokeWidth={1.5}
                fill={INK.pulse}
                fillOpacity={0.2}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {interactive && selectedDate && (
                <Line
                  dataKey="pulseRaw"
                  stroke="none"
                  legendType="none"
                  isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; payload?: StoryChartRow; value?: number | null }) => {
                    const { cx, cy, payload, value } = props;
                    if (cx == null || cy == null) return null;
                    if (payload?.date !== selectedDate) return null;
                    if (value === null || value === undefined) return null;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={INK.pulse}
                        stroke="var(--color-sand-50)"
                        strokeWidth={1}
                      />
                    );
                  }}
                  activeDot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="px-0"
          style={{
            marginLeft: CHART_MARGIN_LEFT,
            marginRight: CHART_MARGIN_RIGHT,
          }}
        >
          <MedicationLane rows={laneRows} />
        </div>

        <div
          className="pointer-events-none absolute top-0 hidden md:block"
          style={{
            left: CHART_MARGIN_LEFT,
            right: CHART_MARGIN_RIGHT,
            height: mrsHeight + pulseHeight + laneHeight + 28,
          }}
          aria-hidden
        >
          {markerLines.map((marker) => (
            <div
              key={marker.id}
              className="absolute top-0 border-l border-dashed"
              style={{
                left: `${marker.leftPercent}%`,
                height: '100%',
                borderColor: INK.rule,
                opacity: 0.5,
                borderWidth: 1,
              }}
            />
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={X_AXIS_HEIGHT}>
        <LineChart data={chartData} margin={{ ...CHART_MARGIN, top: 0 }}>
          <XAxis
            dataKey="dateLabel"
            tick={(props) => <ChartDateAxisTick {...props} />}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[0, 1]} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const readout =
    interactive && selectedPoint
      ? StoryPointReadout({
          point: selectedPoint as SymptomTrendPoint & {
            pulseRaw?: number | null;
            gapNotice?: string;
          },
          pulseChannel: activeChannel,
        })
      : null;

  if (!interactive) return plot;

  return <ChartReadoutDock plot={plot} readout={readout} />;
}

function StoryColumnComponent({
  data,
  medications,
  medicationChanges,
  windowStart,
  windowEnd,
  insights,
}: StoryColumnProps) {
  const isEmpty = data.length < 2;

  const pulseDefaults = useMemo(
    () => resolvePulsePanelDefaults(insights, data.map((d) => d.checkin), medicationChanges),
    [insights, data, medicationChanges],
  );

  const [pulseChannel, setPulseChannel] = useState<PulseChannel | null>(null);
  const activeChannel = pulseChannel ?? pulseDefaults.channel;
  const pulseHeader =
    pulseChannel === null
      ? pulseDefaults.header
      : `${PULSE_CHANNELS.find((c) => c.id === activeChannel)?.label} · daily pulse`;

  const { chartData, mrsSegmentKeys } = useMemo(() => {
    const rawValues = data.map((d) => getPulseChannelValue(d.checkin, activeChannel));
    const sparse = data.map((row, i) => ({
      ...row,
      pulseRaw: rawValues[i],
    }));
    const indexed = buildDailyIndexedWeeklyChart(sparse, windowStart, windowEnd, ['mrsTotal']);
    return {
      chartData: indexed.dailyRows as StoryChartRow[],
      mrsSegmentKeys: indexed.weeklySegmentKeys.mrsTotal ?? [],
    };
  }, [data, activeChannel, windowStart, windowEnd]);

  const domainDates = useMemo(() => chartData.map((d) => d.date), [chartData]);

  const laneRows = useMemo(
    () =>
      buildMedicationLaneRows(
        medications,
        medicationChanges,
        domainDates,
        windowStart,
        windowEnd,
      ),
    [medications, medicationChanges, domainDates, windowStart, windowEnd],
  );

  const markerLines = useMemo(
    () => doseChangeMarkerPercents(medicationChanges, domainDates, windowStart, windowEnd),
    [medicationChanges, domainDates, windowStart, windowEnd],
  );

  const windowRegions = useMemo(
    () => observationWindowRegions(medicationChanges, windowStart, windowEnd),
    [medicationChanges, windowStart, windowEnd],
  );

  const chartProps = {
    chartData,
    mrsSegmentKeys,
    activeChannel,
    pulseHeader,
    onPulseChannel: setPulseChannel,
    laneRows,
    markerLines,
    windowRegions,
  };

  return (
    <ChartCard
      title="Symptom & Medication Overview"
      description="Your score, daily pulse, and medications on one timeline"
      isEmpty={isEmpty}
      emptyState={{
        message: 'Check in at least twice to see your symptom trends here.',
        actionLabel: 'Go to Check In',
        onAction: () => {
          window.location.href = '/checkin';
        },
      }}
      minHeight="360px"
      expandable
      expandedMinHeight="75vh"
    >
      {({ interactive }) =>
        !isEmpty ? (
          <>
            <StoryChartsBody
              {...chartProps}
              mrsHeight={interactive ? PANEL_MRS_HEIGHT_EXPANDED : PANEL_MRS_HEIGHT}
              pulseHeight={interactive ? PANEL_PULSE_HEIGHT_EXPANDED : PANEL_PULSE_HEIGHT}
              interactive={interactive}
            />
            {windowRegions.length > 0 && (
              <p className="mt-2 text-xs text-sage-400">
                Shaded area — observation window after a dose change.
              </p>
            )}
          </>
        ) : null
      }
    </ChartCard>
  );
}

export const StoryColumn = memo(StoryColumnComponent);
