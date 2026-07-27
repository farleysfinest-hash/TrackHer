import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ChartScrubRegion } from '../ui/ChartScrubRegion';
import { ChartReadoutDock } from './ChartReadoutDock';
import { StoryPointReadout } from './ChartTooltipContent';
import { MedicationLane } from './MedicationLane';
import { ObservationWindowAreas } from './ObservationWindowAreas';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { WeeklySegmentLines } from './WeeklySegmentLines';
import {
  medicationLaneBlockHeight,
  CHART_MARGIN_LEFT,
  CHART_MARGIN_RIGHT,
  buildMedicationLaneRows,
  doseChangeMarkerPercents,
} from '../../utils/medicationLaneHelpers';
import {
  PULSE_CHANNELS,
  type PulseChannel,
} from '../../utils/storyColumnHelpers';
import type { SymptomTrendPoint } from '../../hooks/useChartData';
import { observationWindowRegions } from '../../utils/medicationHelpers';
import { buildDailyIndexedWeeklyChart } from '../../utils/weeklyChartSeries';
import { ChartDateAxisTick } from './ChartDateAxisTick';
import { useChartSelection } from '../../hooks/useChartSelection';

export const PANEL_MRS_HEIGHT = 80;
export const PANEL_PULSE_HEIGHT = 64;
export const PANEL_MRS_HEIGHT_EXPANDED = 180;
export const PANEL_PULSE_HEIGHT_EXPANDED = 140;
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
  bottom: 8,
} as const;

export type StoryChartRow = ReturnType<typeof buildDailyIndexedWeeklyChart>['dailyRows'][number] & {
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

export interface StoryChartsBodyProps {
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

export function StoryChartsBody({
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
  const { selectedDate, selectDate } = useChartSelection(interactive);

  const mrsDates = useMemo(
    () =>
      chartData
        .filter((row) => row.mrsTotal !== null && row.mrsTotal !== undefined)
        .map((row) => row.date),
    [chartData],
  );
  const pulseDates = useMemo(
    () =>
      chartData
        .filter((row) => row.pulseRaw !== null && row.pulseRaw !== undefined)
        .map((row) => row.date),
    [chartData],
  );

  const selectedPoint = useMemo(() => {
    if (!selectedDate) return null;
    return chartData.find((row) => row.date === selectedDate) ?? null;
  }, [chartData, selectedDate]);

  const laneHeight = medicationLaneBlockHeight(laneRows);
  const mrsTicks = [0, 22, 44];

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
        <ChartScrubRegion
          dates={mrsDates}
          domainDates={chartData.map((row) => row.date)}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          ariaLabel="Explore MRS score by date"
          insets={CHART_MARGIN}
          enabled={interactive}
        >
          <ResponsiveContainer width="100%" height={mrsHeight}>
            <LineChart
              data={chartData}
              margin={CHART_MARGIN}
              accessibilityLayer={false}
            >
              <XAxis dataKey="date" hide />
              <ObservationWindowAreas regions={windowRegions} />
              {interactive && selectedDate && (
                <ReferenceLine
                  x={selectedDate}
                  stroke={INK.rule}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <YAxis
                domain={[0, 44]}
                ticks={mrsTicks}
                tick={{ fontSize: 10, fill: CHART_COLORS.axisText }}
                width={CHART_MARGIN_LEFT}
                axisLine={false}
                tickLine={false}
              />
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
        </ChartScrubRegion>

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
          <ChartScrubRegion
            dates={pulseDates}
            domainDates={chartData.map((row) => row.date)}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
            ariaLabel={`Explore ${activeChannel} pulse by date`}
            insets={CHART_MARGIN}
            enabled={interactive}
          >
            <ResponsiveContainer width="100%" height={pulseHeight}>
              <AreaChart
                data={chartData}
                margin={CHART_MARGIN}
                accessibilityLayer={false}
              >
                <XAxis dataKey="date" hide />
                <ObservationWindowAreas regions={windowRegions} />
                {interactive && selectedDate && (
                  <ReferenceLine
                    x={selectedDate}
                    stroke={INK.rule}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 5]}
                  tick={(props) => <PulseAxisTick {...props} channel={activeChannel} />}
                  width={CHART_MARGIN_LEFT}
                  axisLine={false}
                  tickLine={false}
                />
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
          </ChartScrubRegion>
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
        <LineChart
          data={chartData}
          margin={{ ...CHART_MARGIN, top: 0 }}
          accessibilityLayer={false}
        >
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
      {windowRegions.length > 0 && (
        <p className="mt-2 text-sm leading-relaxed text-sage-500">
          Shaded area — observation window after a dose change.
        </p>
      )}
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
