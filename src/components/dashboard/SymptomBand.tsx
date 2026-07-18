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
import { SEVERITY_LABELS } from '../../utils/checkinHelpers';

export const BAND_CHART_HEIGHT = 44;
export const BAND_X_AXIS_HEIGHT = 28;

export const BAND_CHART_MARGIN = {
  top: 6,
  right: 6,
  left: 8,
  bottom: 0,
} as const;

const BAND_INK = {
  line: '#7a3b5e',
  dot: '#a64d79',
  fill: '#c989a7',
  baseline: '#f0eaec',
  marker: '#a64d79',
} as const;

export type SymptomBandTooltipMode = 'severity' | 'subscale' | 'plain';

export interface SymptomBandRow {
  date: string;
  dateLabel: string;
  gapNotice?: string;
  [key: string]: string | number | null | undefined;
}

interface SymptomBandProps {
  name: string;
  dataKey: string;
  data: SymptomBandRow[];
  segmentKeys: string[];
  domainMax: number;
  syncId: string;
  tooltipMode?: SymptomBandTooltipMode;
}

function latestValue(rows: SymptomBandRow[], dataKey: string): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const value = rows[i][dataKey];
    if (value !== null && value !== undefined) return Number(value);
  }
  return null;
}

interface SymptomBandTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: SymptomBandRow }>;
  label?: string | number;
  name: string;
  dataKey: string;
  domainMax: number;
  tooltipMode: SymptomBandTooltipMode;
}

function SymptomBandTooltip({
  active,
  payload,
  label,
  name,
  dataKey,
  domainMax,
  tooltipMode,
}: SymptomBandTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const raw = point[dataKey];
  if (raw === null || raw === undefined) return null;

  const value = Number(raw);
  const gapNotice = point.gapNotice;

  let valueLabel = String(value);
  if (tooltipMode === 'severity' && value >= 0 && value < SEVERITY_LABELS.length) {
    valueLabel = `${value} (${SEVERITY_LABELS[value]})`;
  } else if (tooltipMode === 'subscale') {
    valueLabel = `${value} of ${domainMax}`;
  }

  return (
    <div className="rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm shadow-lg">
      <p className="font-medium text-sage-800">{label}</p>
      {gapNotice && <p className="mt-1 text-sage-600">{gapNotice}</p>}
      <p className="mt-1 text-sage-700">
        {name}: <strong>{valueLabel}</strong>
      </p>
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
}: SymptomBandProps) {
  const now = latestValue(data, dataKey);
  const nowLabel =
    now === null
      ? '—'
      : tooltipMode === 'subscale'
        ? `${now} of ${domainMax}`
        : String(now);

  return (
    <div>
      <p className="text-[10px] text-sage-700">
        {name}
        <span className="text-[#b896a3]"> · now {nowLabel}</span>
      </p>
      <ResponsiveContainer width="100%" height={BAND_CHART_HEIGHT}>
        <ComposedChart data={data} margin={BAND_CHART_MARGIN} syncId={syncId}>
          <ReferenceLine y={0} stroke={BAND_INK.baseline} strokeWidth={1} />
          {segmentKeys.map((segmentKey) => (
            <Area
              key={`area-${segmentKey}`}
              dataKey={segmentKey}
              type="monotone"
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
              type="monotone"
              stroke={BAND_INK.line}
              strokeWidth={1.8}
              connectNulls
              isAnimationActive={false}
              legendType="none"
              dot={{
                r: 2.6,
                fill: BAND_INK.dot,
                stroke: '#ffffff',
                strokeWidth: 0.8,
              }}
              activeDot={{
                r: 4,
                fill: BAND_INK.dot,
                stroke: '#ffffff',
                strokeWidth: 0.8,
              }}
            />
          ))}
          <YAxis hide domain={[0, domainMax]} />
          <Tooltip
            content={
              <SymptomBandTooltip
                name={name}
                dataKey={dataKey}
                domainMax={domainMax}
                tooltipMode={tooltipMode}
              />
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
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
  markers: Array<{ id: string; leftPercent: number }>;
  height: number;
}

export function BandDoseMarkerOverlay({ markers, height }: BandDoseMarkerOverlayProps) {
  if (markers.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute top-0"
      style={{
        left: BAND_CHART_MARGIN.left,
        right: BAND_CHART_MARGIN.right,
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
