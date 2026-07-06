import { getTopConcerns, MRS_CANONICAL_KEYS, MRS_TOTAL_MAX, type MRSScoresMap, type MRSSymptomKey } from '../../utils/checkinHelpers';
import type { SymptomCheckin } from '../../types/database';
import { formatChartDateLong, severityLabel } from '../../utils/chartHelpers';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown>; value?: number }>;
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

  const point = payload[0]?.payload as unknown as SymptomCheckin & {
    mrsTotal?: number;
    wellbeing?: number | null;
    checkin?: SymptomCheckin;
    date?: string;
  };

  const checkin = point?.checkin ?? point;
  const dateStr = point?.date ?? (typeof label === 'string' ? label : '');
  const mrs = point?.mrsTotal ?? checkin?.total_score;
  const wellbeing = point?.wellbeing ?? checkin?.overall_wellbeing;

  if (!checkin?.hot_flashes && mrs === undefined) return null;

  const concerns =
    checkin?.hot_flashes !== undefined ? getTopConcerns(checkinToScores(checkin), 3) : [];

  return (
    <div className="rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm shadow-lg">
      <p className="font-medium text-sage-800">
        {dateStr.includes('-') ? formatChartDateLong(dateStr) : label}
      </p>
      {mrs !== undefined && (
        <p className="mt-1 text-sage-700">
          MRS Score: <strong>{mrs}</strong>/{MRS_TOTAL_MAX}
        </p>
      )}
      {wellbeing !== null && wellbeing !== undefined && (
        <p className="text-sage-700">
          Wellbeing: <strong>{wellbeing}</strong>/10
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
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm shadow-lg">
      <p className="font-medium text-sage-800">{label}</p>
      <p className="mt-1 text-sage-700">
        {biomarkerLabel}: <strong>{value}</strong> {unit}
      </p>
    </div>
  );
}
