import { hasMRSData, hasPartialMRSData, getDailySignal } from '../../utils/checkinHelpers';
import { addDaysISO } from '../../utils/localDate';
import type { SymptomCheckin } from '../../types/database';
import type { DateRange, DateRangePreset } from '../../stores/dashboardStore';

export function periodDaysLabel(preset: DateRangePreset): string {
  switch (preset) {
    case '30d':
      return 'days logged in the last 30 days';
    case '90d':
      return 'days logged in the last 90 days';
    case '6mo':
      return 'days logged in the last 6 months';
    case '1yr':
      return 'days logged in the last year';
    default:
      return 'days logged in this period';
  }
}

export interface ScoreSummary {
  mrsValue: string | number;
  mrsSubtext: string;
  energyValue: string | number;
  energySubtext: string;
  burdenHeadline: string;
  burdenDetail?: string;
  burdenImproving: boolean;
  daysLogged: number;
}

/**
 * Build dashboard summary stats for the selected timeline.
 * `checkins` may include a short pre-range lookback used only for month-ago burden.
 */
export function buildScoreSummary(
  checkins: SymptomCheckin[],
  dateRange: DateRange,
): ScoreSummary {
  const inRange = checkins
    .filter((c) => c.checkin_date >= dateRange.start && c.checkin_date <= dateRange.end)
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));

  const mrsCheckinsInRange = inRange.filter(hasMRSData);
  const latestMrs = mrsCheckinsInRange[0];
  const latestPartialMrs = inRange.find((c) => hasPartialMRSData(c) && !hasMRSData(c));
  const latest = inRange[0];

  let burdenHeadline = '—';
  let burdenDetail: string | undefined;
  let burdenImproving = false;

  if (latestMrs) {
    const baselineCutoff = addDaysISO(latestMrs.checkin_date, -30);
    const older = [...checkins]
      .filter(hasMRSData)
      .filter((c) => c.checkin_date <= baselineCutoff)
      .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0];
    if (older) {
      const diff = latestMrs.total_score - older.total_score;
      if (diff === 0) {
        burdenHeadline = 'No change';
        burdenDetail = 'same as a month ago';
      } else {
        burdenImproving = diff < 0;
        burdenHeadline = burdenImproving ? 'Easing' : 'Worth watching';
        burdenDetail = `${burdenImproving ? '↓' : '↑'} ${Math.abs(diff)} pts vs. a month ago`;
      }
    }
  }

  const energySignal = latest ? getDailySignal(latest) : null;
  const channelSubtext = latest
    ? [
        latest.mood_level != null ? `Mood ${latest.mood_level}` : null,
        latest.sleep_quality != null ? `Sleep ${latest.sleep_quality}/5` : null,
      ]
        .filter(Boolean)
        .join(' · ') || undefined
    : undefined;

  return {
    mrsValue: latestMrs
      ? latestMrs.total_score
      : latestPartialMrs
        ? 'Incomplete check-in'
        : '—',
    mrsSubtext: latestMrs
      ? `/44 · Psych ${latestMrs.psychological_score ?? '—'} · Som ${latestMrs.somatic_score ?? '—'} · Uro ${latestMrs.urogenital_score ?? '—'}`
      : latestPartialMrs
        ? 'Finish your check-in to see a score'
        : '/44',
    energyValue: energySignal ?? '—',
    energySubtext: channelSubtext ?? '/5',
    burdenHeadline,
    burdenDetail,
    burdenImproving,
    daysLogged: new Set(inRange.map((c) => c.checkin_date)).size,
  };
}
