import {
  getTopConcerns,
  hasMRSData,
  MRS_CANONICAL_KEYS,
  MRS_TOTAL_MAX,
  getDailySignal,
  type MRSScoresMap,
  type MRSSymptomKey,
} from '../../utils/checkinHelpers';
import type { SymptomCheckin } from '../../types/database';
import { formatChartDateLong, severityLabel } from '../../utils/chartHelpers';
import { formatLabChartValue } from '../../utils/labChartHelpers';
import { CHART_TOOLTIP_SURFACE_STYLE } from '../../utils/chartStyle';
import type { SymptomTrendPoint } from '../../hooks/useChartData';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    color?: string;
    name?: string;
    payload?: Record<string, unknown>;
    value?: number;
  }>;
  label?: string | number;
}

function checkinToScores(checkin: SymptomCheckin): MRSScoresMap {
  const scores = {} as MRSScoresMap;
  for (const key of MRS_CANONICAL_KEYS) {
    scores[key] = checkin[key as MRSSymptomKey] as typeof scores[typeof key];
  }
  return scores;
}

export function ChartTooltipContent(props: ChartTooltipProps) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as SymptomTrendPoint & { gapNotice?: string } | undefined;
  if (!point) return null;

  const checkin = point.checkin;
  const dateStr = point.date ?? (typeof label === 'string' ? label : '');
  const gapNotice = 'gapNotice' in point ? point.gapNotice : undefined;
  const measuredMrs = point.mrsTotal !== null && point.mrsTotal !== undefined;
  const energy =
    point.wellbeing !== null && point.wellbeing !== undefined
      ? point.wellbeing
      : checkin
        ? getDailySignal(checkin)
        : null;

  if (!measuredMrs && (energy === null || energy === undefined)) return null;

  const concerns =
    checkin && hasMRSData(checkin) ? getTopConcerns(checkinToScores(checkin), 3) : [];

  return (
    <div
      className="rounded-lg border border-sand-200 px-4 py-3 text-sm shadow-lg"
      style={CHART_TOOLTIP_SURFACE_STYLE}
    >
      <p className="font-medium text-sage-800">
        {dateStr.includes('-') ? formatChartDateLong(dateStr) : label}
      </p>
      {gapNotice && <p className="mt-1 text-sage-600">{gapNotice}</p>}
      {measuredMrs && (
        <p className="mt-1 text-sage-700">
          MRS Score: <strong>{point.mrsTotal}</strong>/{MRS_TOTAL_MAX}
        </p>
      )}
      {energy !== null && energy !== undefined && (
        <p className="text-sage-700">
          Energy: <strong>{energy}</strong>/5
        </p>
      )}
      {concerns.length > 0 && (
        <div className="mt-2 border-t border-sand-100 pt-2">
          <p className="text-xs text-sage-400">Top symptoms</p>
          {concerns.map((c) => (
            <p key={c.key} className="text-xs text-sage-600">
              {c.label}: {severityLabel(c.score)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function LabTooltipContent(
  props: ChartTooltipProps & { biomarkerLabel?: string; unit?: string },
) {
  const { active, payload, label, biomarkerLabel, unit } = props;
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as { date?: string; dateLabel?: string; value?: number } | undefined;
  const rawValue = point?.value ?? payload[0]?.value;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  if (!Number.isFinite(numericValue)) return null;

  const dateHeading =
    (typeof point?.date === 'string' && point.date.includes('-')
      ? formatChartDateLong(point.date)
      : null) ??
    (typeof label === 'string' ? label : point?.dateLabel ?? '');

  return (
    <div
      className="rounded-lg border border-sand-200 px-4 py-3 text-sm shadow-lg"
      style={CHART_TOOLTIP_SURFACE_STYLE}
    >
      <p className="font-medium text-sage-800">{dateHeading}</p>
      <p className="mt-1 text-sage-700">
        {biomarkerLabel}: <strong>{formatLabChartValue(numericValue)}</strong> {unit}
      </p>
      <p className="mt-2 text-[11px] text-sage-400">Tap the chart again to dismiss</p>
    </div>
  );
}
