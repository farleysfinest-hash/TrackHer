import type { ReactNode } from 'react';
import {
  getTopConcerns,
  hasMRSData,
  MRS_CANONICAL_KEYS,
  MRS_TOTAL_MAX,
  type MRSScoresMap,
  type MRSSymptomKey,
} from '../../utils/checkinHelpers';
import type { SymptomCheckin } from '../../types/database';
import { formatChartDateLong, severityLabel } from '../../utils/chartHelpers';
import { formatLabChartValue } from '../../utils/labChartHelpers';
import { CHART_TOOLTIP_SURFACE_STYLE } from '../../utils/chartStyle';
import {
  getPulseChannelValue,
  PULSE_CHANNELS,
  type PulseChannel,
} from '../../utils/storyColumnHelpers';
import type { SymptomTrendPoint } from '../../hooks/useChartData';

function checkinToScores(checkin: SymptomCheckin): MRSScoresMap {
  const scores = {} as MRSScoresMap;
  for (const key of MRS_CANONICAL_KEYS) {
    scores[key] = checkin[key as MRSSymptomKey] as typeof scores[typeof key];
  }
  return scores;
}

const READOUT_SHELL =
  'max-w-full overflow-hidden break-words rounded-lg border border-sand-200 px-3 py-2.5 text-sm shadow-sm';

export function ChartReadoutShell({ children }: { children: ReactNode }) {
  return (
    <div className={READOUT_SHELL} style={CHART_TOOLTIP_SURFACE_STYLE}>
      {children}
    </div>
  );
}

type StoryPoint = SymptomTrendPoint & { pulseRaw?: number | null; gapNotice?: string };

function resolvePulseValue(point: StoryPoint, pulseChannel: PulseChannel): number | null {
  const fromChannel = point.checkin ? getPulseChannelValue(point.checkin, pulseChannel) : null;
  if (fromChannel !== null && fromChannel !== undefined) return fromChannel;
  if (point.pulseRaw !== null && point.pulseRaw !== undefined) return point.pulseRaw;
  return null;
}

/** Symptom & Medication Overview — docked selected-date readout (or null). */
export function StoryPointReadout({
  point,
  pulseChannel,
}: {
  point: StoryPoint;
  pulseChannel: PulseChannel;
}): ReactNode {
  const checkin = point.checkin;
  const dateStr = point.date;
  const gapNotice = point.gapNotice;
  const measuredMrs = point.mrsTotal !== null && point.mrsTotal !== undefined;
  const pulseValue = resolvePulseValue(point, pulseChannel);

  if (!measuredMrs && pulseValue === null) return null;

  const pulseLabel =
    PULSE_CHANNELS.find((c) => c.id === pulseChannel)?.label ?? 'Energy';

  const concerns =
    checkin && hasMRSData(checkin) ? getTopConcerns(checkinToScores(checkin), 3) : [];

  return (
    <ChartReadoutShell>
      <p className="font-medium leading-snug text-sage-800">
        {dateStr.includes('-') ? formatChartDateLong(dateStr) : dateStr}
      </p>
      {gapNotice && <p className="mt-1 leading-snug text-sage-600">{gapNotice}</p>}
      {measuredMrs && (
        <p className="mt-1 leading-snug text-sage-700">
          MRS Score: <strong>{point.mrsTotal}</strong>/{MRS_TOTAL_MAX}
        </p>
      )}
      {pulseValue !== null && (
        <p className="leading-snug text-sage-700">
          {pulseLabel}: <strong>{pulseValue}</strong>/5
        </p>
      )}
      {concerns.length > 0 && (
        <div className="mt-2 border-t border-sand-100 pt-2">
          <p className="text-xs text-sage-400">Top symptoms</p>
          {concerns.map((c) => (
            <p key={c.key} className="text-xs leading-snug text-sage-600">
              {c.label}: {severityLabel(c.score)}
            </p>
          ))}
        </div>
      )}
    </ChartReadoutShell>
  );
}

/** Lab trend — docked selected-draw readout (or null). */
export function LabPointReadout({
  point,
  biomarkerLabel,
  unit,
}: {
  point: { date?: string; dateLabel?: string; value?: number };
  biomarkerLabel: string;
  unit: string;
}): ReactNode {
  const numericValue = typeof point.value === 'number' ? point.value : Number(point.value);
  if (!Number.isFinite(numericValue)) return null;

  const dateHeading =
    (typeof point.date === 'string' && point.date.includes('-')
      ? formatChartDateLong(point.date)
      : null) ??
    point.dateLabel ??
    '';

  return (
    <ChartReadoutShell>
      <p className="font-medium leading-snug text-sage-800">{dateHeading}</p>
      <p className="mt-1 leading-snug text-sage-700">
        {biomarkerLabel}: <strong>{formatLabChartValue(numericValue)}</strong> {unit}
      </p>
      <p className="mt-2 text-[11px] leading-snug text-sage-400">Tap another draw to update</p>
    </ChartReadoutShell>
  );
}
