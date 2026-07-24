import type { ReactNode } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MouseHandlerDataParam } from 'recharts';
import { dateFromChartClick } from '../../utils/chartSelection';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';
import { ObservationWindowAreas } from './ObservationWindowAreas';
import { ChartReadoutShell } from './ChartTooltipContent';
import { ChartDateAxisTick } from './ChartDateAxisTick';
import type { ObservationWindowRegion } from '../../utils/medicationHelpers';
import type { DoseChangeMarkerPercent } from '../../utils/medicationLaneHelpers';

export const BAND_CHART_HEIGHT = 44;
export const BAND_X_AXIS_HEIGHT = 28;

export const BAND_CHART_MARGIN = {
  top: 6,
  right: 6,
  left: 8,
  bottom: 0,
} as const;

const BAND_INK = {
  line: 'var(--color-chart-line-primary)',
  dot: 'var(--color-chart-dot)',
  fill: 'var(--color-chart-pulse)',
  baseline: 'var(--color-chart-grid)',
  marker: 'var(--color-chart-marker)',
} as const;

export type SymptomBandTooltipMode = 'severity' | 'subscale' | 'plain';

export interface SymptomBandRow {
  date: string;
  dateLabel: string;
  gapNotice?: string;
  [key: string]: string | number | null | undefined;
}

export interface BandTooltipSeries {
  name: string;
  dataKey: string;
  domainMax: number;
}

interface SymptomBandProps {
  name: string;
  dataKey: string;
  data: SymptomBandRow[];
  segmentKeys: string[];
  domainMax: number;
  /** @deprecated Kept for call-site compatibility; selection replaces sync tooltips. */
  syncId?: string;
  tooltipMode?: SymptomBandTooltipMode;
  /** @deprecated Selection is owned by the card host; ignored. */
  tooltipSeries?: BandTooltipSeries[];
  /** @deprecated Selection is owned by the card host; ignored. */
  isTooltipHost?: boolean;
  /** @deprecated Selection is owned by the card host; ignored. */
  showMrsTotal?: boolean;
  markers?: DoseChangeMarkerPercent[];
  observationRegions?: ObservationWindowRegion[];
  /** When false, no selection / enlarged selected dot (inline dashboard). */
  interactive?: boolean;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
}

function latestValue(rows: SymptomBandRow[], dataKey: string): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const value = rows[i][dataKey];
    if (value !== null && value !== undefined) return Number(value);
  }
  return null;
}

function formatBandValue(
  value: number,
  domainMax: number,
  tooltipMode: SymptomBandTooltipMode,
): string {
  if (tooltipMode === 'severity' && value >= 0 && value < SEVERITY_LABELS.length) {
    return `${value} (${SEVERITY_LABELS[value]})`;
  }
  if (tooltipMode === 'subscale') {
    return `${value} / ${domainMax}`;
  }
  return String(value);
}

export function BandPointReadout({
  point,
  tooltipSeries,
  tooltipMode,
  showMrsTotal = false,
}: {
  point: SymptomBandRow;
  tooltipSeries: BandTooltipSeries[];
  tooltipMode: SymptomBandTooltipMode;
  showMrsTotal?: boolean;
}): ReactNode {
  const lines = tooltipSeries
    .map((series) => {
      const raw = point[series.dataKey];
      if (raw === null || raw === undefined) return null;
      const value = Number(raw);
      return {
        name: series.name,
        label: formatBandValue(value, series.domainMax, tooltipMode),
        value,
      };
    })
    .filter((line): line is { name: string; label: string; value: number } => line !== null);

  if (lines.length === 0) return null;

  const mrsTotal = showMrsTotal ? lines.reduce((sum, line) => sum + line.value, 0) : null;

  return (
    <ChartReadoutShell>
      <p className="font-medium leading-snug text-sage-800">{point.dateLabel}</p>
      {point.gapNotice && (
        <p className="mt-0.5 leading-snug text-sage-600">{point.gapNotice}</p>
      )}
      <div className="mt-0.5 space-y-0.5">
        {lines.map((line) => (
          <p key={line.name} className="leading-snug text-sage-700">
            {line.name} · <strong>{line.label}</strong>
          </p>
        ))}
      </div>
      {mrsTotal !== null && (
        <p className="mt-1 border-t border-sand-100 pt-1 leading-snug text-sage-700">
          MRS total · <strong>{mrsTotal} / 44</strong>
        </p>
      )}
    </ChartReadoutShell>
  );
}

export function SymptomBand({
  name,
  dataKey,
  data,
  segmentKeys,
  domainMax,
  tooltipMode = 'plain',
  markers,
  observationRegions,
  interactive = true,
  selectedDate = null,
  onSelectDate,
}: SymptomBandProps) {
  const latest = latestValue(data, dataKey);
  const latestLabel =
    latest === null
      ? '—'
      : tooltipMode === 'subscale'
        ? `${latest} / ${domainMax}`
        : String(latest);

  const dates = data.map((row) => row.date);

  const handleClick = (state: MouseHandlerDataParam) => {
    if (!interactive || !onSelectDate) return;
    const date = dateFromChartClick(state, dates);
    if (date) onSelectDate(date);
  };

  return (
    <div>
      <p className="text-[10px] text-sage-700">
        {name}
        <span className="text-chart-axis"> · latest {latestLabel}</span>
      </p>
      <div className="relative">
        {markers && markers.length > 0 && (
          <BandDoseMarkerOverlay markers={markers} height={BAND_CHART_HEIGHT} />
        )}
        <ResponsiveContainer width="100%" height={BAND_CHART_HEIGHT}>
          <ComposedChart
            data={data}
            margin={BAND_CHART_MARGIN}
            onClick={interactive ? handleClick : undefined}
          >
            <XAxis dataKey="date" hide />
            {observationRegions && observationRegions.length > 0 && (
              <ObservationWindowAreas regions={observationRegions} />
            )}
            <ReferenceLine y={0} stroke={BAND_INK.baseline} strokeWidth={1} />
            {segmentKeys.map((segmentKey) => (
              <Area
                key={`area-${segmentKey}`}
                dataKey={segmentKey}
                type="linear"
                stroke="none"
                fill={BAND_INK.fill}
                fillOpacity={0.12}
                connectNulls
                isAnimationActive={false}
                legendType="none"
              />
            ))}
            {segmentKeys.map((segmentKey, index) => (
              <Line
                key={`line-${segmentKey}`}
                dataKey={segmentKey}
                name={index === 0 ? name : undefined}
                type="linear"
                stroke={BAND_INK.line}
                strokeWidth={1.8}
                connectNulls
                isAnimationActive={false}
                legendType="none"
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: SymptomBandRow;
                }) => {
                  const { cx, cy, payload } = props;
                  if (cx == null || cy == null) return null;
                  const selected = interactive && payload?.date === selectedDate;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={selected ? 4 : 2.6}
                      fill={BAND_INK.dot}
                      stroke="var(--color-sand-50)"
                      strokeWidth={0.8}
                    />
                  );
                }}
                activeDot={false}
              />
            ))}
            <YAxis hide domain={[0, domainMax]} />
            {interactive && (
              <Tooltip
                content={() => null}
                cursor={false}
                isAnimationActive={false}
                wrapperStyle={{ display: 'none' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface BandXAxisProps {
  data: SymptomBandRow[];
}

export function BandXAxis({ data }: BandXAxisProps) {
  return (
    <ResponsiveContainer width="100%" height={BAND_X_AXIS_HEIGHT}>
      <ComposedChart data={data} margin={{ ...BAND_CHART_MARGIN, top: 0 }}>
        <XAxis
          dataKey="dateLabel"
          tick={(props) => <ChartDateAxisTick {...props} />}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide domain={[0, 1]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

interface BandDoseMarkerOverlayProps {
  markers: DoseChangeMarkerPercent[];
  height: number;
  insetLeft?: number;
  insetRight?: number;
}

export function BandDoseMarkerOverlay({
  markers,
  height,
  insetLeft = BAND_CHART_MARGIN.left,
  insetRight = BAND_CHART_MARGIN.right,
}: BandDoseMarkerOverlayProps) {
  if (markers.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute top-0"
      style={{
        left: insetLeft,
        right: insetRight,
        height,
      }}
      aria-hidden
    >
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute top-0 border-l border-dashed"
          style={{
            left: `${marker.leftPercent}%`,
            height: '100%',
            borderColor: BAND_INK.marker,
            opacity: 0.4,
            borderWidth: 1,
          }}
        />
      ))}
    </div>
  );
}
