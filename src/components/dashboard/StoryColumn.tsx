import { memo, useMemo, useState } from 'react';
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
import { ChartCard } from '../ui/ChartCard';
import { ChartTooltipContent } from './ChartTooltipContent';
import { MedicationLane } from './MedicationLane';
import { CHART_COLORS } from '../../utils/chartHelpers';
import { formatChartDateLong } from '../../utils/chartHelpers';
import {
  buildMedicationLaneRows,
  doseChangeMarkerPercents,
  CHART_MARGIN_LEFT,
  CHART_MARGIN_RIGHT,
} from '../../utils/medicationLaneHelpers';
import {
  getPulseChannelValue,
  PULSE_CHANNELS,
  resolvePulsePanelDefaults,
  type PulseChannel,
} from '../../utils/storyColumnHelpers';
import type { SymptomTrendPoint } from '../../hooks/useChartData';
import type { Medication, MedicationChange } from '../../types/database';
import type { Insight } from '../../engine/types';

const PANEL_MRS_HEIGHT = 200;
const PANEL_PULSE_HEIGHT = 170;
const X_AXIS_HEIGHT = 28;
const LANE_ROW_HEIGHT = 50;
const SYNC_ID = 'story-column';

const INK = {
  mrsStroke: '#7a3b5e',
  mrsDot: '#a64d79',
  pulse: '#c989a7',
  rule: '#a64d79',
} as const;

const CHART_MARGIN = {
  top: 4,
  right: CHART_MARGIN_RIGHT,
  left: CHART_MARGIN_LEFT,
  bottom: 0,
} as const;

interface StoryColumnProps {
  data: SymptomTrendPoint[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  windowStart: string;
  windowEnd: string;
  insights: Insight[];
}

interface PulseTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  label?: string | number;
  channel: PulseChannel;
}

function PulseTooltip({ active, payload, label, channel }: PulseTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as { date?: string; pulseRaw?: number | null } | undefined;
  if (!point || point.pulseRaw === null || point.pulseRaw === undefined) return null;

  const channelLabel = PULSE_CHANNELS.find((c) => c.id === channel)?.label ?? 'Pulse';
  const dateStr = point.date ?? (typeof label === 'string' ? label : '');

  return (
    <div className="rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm shadow-lg">
      <p className="font-medium text-sage-800">
        {dateStr.includes('-') ? formatChartDateLong(dateStr) : label}
      </p>
      <p className="mt-1 text-sage-700">
        {channelLabel}: <strong>{point.pulseRaw}</strong>/5
      </p>
    </div>
  );
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
      : `${PULSE_CHANNELS.find((c) => c.id === activeChannel)?.label} · daily pulse · 1–5`;

  const chartData = useMemo(() => {
    const rawValues = data.map((d) => getPulseChannelValue(d.checkin, activeChannel));
    return data.map((row, i) => ({
      ...row,
      pulseRaw: rawValues[i],
    }));
  }, [data, activeChannel]);

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

  const laneHeight = laneRows.length > 0 ? laneRows.length * LANE_ROW_HEIGHT + 8 : 0;

  const mrsTicks = [0, 22, 44];
  const pulseTicks = [1, 2, 3, 4, 5];

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
    >
      {!isEmpty && (
        <div>
          <p className="mb-1 text-[10px] text-sage-500">MRS score · weekly · 0–44</p>

          <div className="relative">
            <ResponsiveContainer width="100%" height={PANEL_MRS_HEIGHT}>
              <LineChart data={chartData} margin={CHART_MARGIN} syncId={SYNC_ID}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <YAxis
                  domain={[0, 44]}
                  ticks={mrsTicks}
                  tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
                  width={CHART_MARGIN_LEFT}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="mrsTotal"
                  type="monotone"
                  stroke={INK.mrsStroke}
                  strokeWidth={2.5}
                  connectNulls
                  isAnimationActive={false}
                  dot={{ r: 4.5, fill: INK.mrsDot, stroke: INK.mrsDot, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: INK.mrsDot, stroke: '#ffffff', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-1">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[10px] leading-snug text-sage-500">{pulseHeader}</p>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {PULSE_CHANNELS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setPulseChannel(chip.id)}
                      className={[
                        'rounded-2xl px-2.5 py-1 text-[10px] font-medium transition-colors',
                        activeChannel === chip.id
                          ? 'bg-sage-500 text-white'
                          : 'border border-sand-200 text-sage-600 hover:bg-sage-50',
                      ].join(' ')}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={PANEL_PULSE_HEIGHT}>
                <AreaChart data={chartData} margin={CHART_MARGIN} syncId={SYNC_ID}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <YAxis
                    domain={[1, 5]}
                    ticks={pulseTicks}
                    tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
                    width={CHART_MARGIN_LEFT}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<PulseTooltip channel={activeChannel} />} />
                  <Area
                    dataKey="pulseRaw"
                    type="monotone"
                    stroke={INK.pulse}
                    strokeWidth={1.5}
                    fill={INK.pulse}
                    fillOpacity={0.2}
                    dot={false}
                    activeDot={{ r: 5, fill: INK.pulse }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
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
              className="pointer-events-none absolute top-0"
              style={{
                left: CHART_MARGIN_LEFT,
                right: CHART_MARGIN_RIGHT,
                height: PANEL_MRS_HEIGHT + PANEL_PULSE_HEIGHT + laneHeight + 28,
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
                tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={[0, 1]} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export const StoryColumn = memo(StoryColumnComponent);
