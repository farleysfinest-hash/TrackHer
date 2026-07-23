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
import { CHART_COLORS } from '../../utils/chartHelpers';
import {
  CHART_TOOLTIP_SURFACE_STYLE,
  CHART_TOOLTIP_WRAPPER_STYLE,
} from '../../utils/chartStyle';
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';
import { ObservationWindowAreas } from './ObservationWindowAreas';
import type { ObservationWindowRegion } from '../../utils/medicationHelpers';

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

interface DoseMarker {
  id: string;
  leftPercent: number;
}

interface SymptomBandProps {
  name: string;
  dataKey: string;
  data: SymptomBandRow[];
  segmentKeys: string[];
  domainMax: number;
  syncId: string;
  tooltipMode?: SymptomBandTooltipMode;
  /** All series in this card — used by the host tooltip for a single combined readout. */
  tooltipSeries?: BandTooltipSeries[];
  /** Only the host band renders tooltip content; others keep an empty Tooltip for syncId. */
  isTooltipHost?: boolean;
  /** When true (subscale charts), host tooltip appends MRS total / 44. */
  showMrsTotal?: boolean;
  markers?: DoseMarker[];
  observationRegions?: ObservationWindowRegion[];
  /** When false, no tooltip / activeDot (inline dashboard). Fullscreen passes true. */
  interactive?: boolean;
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

interface SymptomBandTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: SymptomBandRow }>;
  tooltipSeries: BandTooltipSeries[];
  tooltipMode: SymptomBandTooltipMode;
  showMrsTotal?: boolean;
}

function SymptomBandTooltip({
  active,
  payload,
  tooltipSeries,
  tooltipMode,
  showMrsTotal = false,
}: SymptomBandTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

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

  const gapNotice = point.gapNotice;
  const mrsTotal = showMrsTotal ? lines.reduce((sum, line) => sum + line.value, 0) : null;

  return (
    <div
      className="rounded-md border border-sand-200 px-2.5 py-1.5 text-[11px] shadow-md"
      style={CHART_TOOLTIP_SURFACE_STYLE}
    >
      <p className="font-medium text-sage-800">{point.dateLabel}</p>
      {gapNotice && <p className="mt-0.5 text-sage-600">{gapNotice}</p>}
      <div className="mt-0.5 space-y-0.5">
        {lines.map((line) => (
          <p key={line.name} className="text-sage-700">
            {line.name} · <strong>{line.label}</strong>
          </p>
        ))}
      </div>
      {mrsTotal !== null && (
        <p className="mt-1 border-t border-sand-100 pt-1 text-sage-700">
          MRS total · <strong>{mrsTotal} / 44</strong>
        </p>
      )}
    </div>
  );
}

export function SymptomBand({
  name,
  dataKey,
  data,
  segmentKeys,
  domainMax,
  syncId,
  tooltipMode = 'plain',
  tooltipSeries,
  isTooltipHost = false,
  showMrsTotal = false,
  markers,
  observationRegions,
  interactive = true,
}: SymptomBandProps) {
  const latest = latestValue(data, dataKey);
  const latestLabel =
    latest === null
      ? '—'
      : tooltipMode === 'subscale'
        ? `${latest} / ${domainMax}`
        : String(latest);

  const seriesForTooltip: BandTooltipSeries[] = tooltipSeries ?? [
    { name, dataKey, domainMax },
  ];

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
          <ComposedChart data={data} margin={BAND_CHART_MARGIN} syncId={interactive ? syncId : undefined}>
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
                dot={{
                  r: 2.6,
                  fill: BAND_INK.dot,
                  stroke: 'var(--color-sand-50)',
                  strokeWidth: 0.8,
                }}
                activeDot={
                  interactive
                    ? {
                        r: 4,
                        fill: BAND_INK.dot,
                        stroke: 'var(--color-sand-50)',
                        strokeWidth: 0.8,
                      }
                    : false
                }
              />
            ))}
            <YAxis hide domain={[0, domainMax]} />
            {interactive && (
              <Tooltip
                isAnimationActive={false}
                cursor={false}
                wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                content={
                  isTooltipHost ? (
                    <SymptomBandTooltip
                      tooltipSeries={seriesForTooltip}
                      tooltipMode={tooltipMode}
                      showMrsTotal={showMrsTotal}
                    />
                  ) : (
                    () => null
                  )
                }
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
          tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
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
  markers: DoseMarker[];
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
