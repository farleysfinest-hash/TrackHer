import { hasMRSData, hasPartialMRSData, getDailySignal } from '../../utils/checkinHelpers';
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

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function formatAvg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Period-aware dashboard summary.
 * Trends compare the start and end of the selected window — not a fixed "month ago".
 */
export function buildScoreSummary(
  checkins: SymptomCheckin[],
  dateRange: DateRange,
): ScoreSummary {
  const inRange = checkins
    .filter((c) => c.checkin_date >= dateRange.start && c.checkin_date <= dateRange.end)
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));

  const mrsNewestFirst = inRange.filter(hasMRSData);
  const mrsOldestFirst = [...mrsNewestFirst].sort((a, b) =>
    a.checkin_date.localeCompare(b.checkin_date),
  );
  const latestMrs = mrsNewestFirst[0];
  const earliestMrs = mrsOldestFirst[0];
  const latestPartialMrs = inRange.find((c) => hasPartialMRSData(c) && !hasMRSData(c));
  const latest = inRange[0];

  const mrsAverage = average(mrsNewestFirst.map((c) => c.total_score));

  let burdenHeadline = '—';
  let burdenDetail: string | undefined;
  let burdenImproving = false;

  if (earliestMrs && latestMrs && earliestMrs.id !== latestMrs.id) {
    const diff = latestMrs.total_score - earliestMrs.total_score;
    if (diff === 0) {
      burdenHeadline = 'No change';
      burdenDetail = 'same from start to end of this period';
    } else {
      burdenImproving = diff < 0;
      burdenHeadline = burdenImproving ? 'Easing' : 'Worth watching';
      burdenDetail = `${burdenImproving ? '↓' : '↑'} ${Math.abs(diff)} pts over this period`;
    }
  } else if (latestMrs) {
    burdenHeadline = 'Getting started';
    burdenDetail = 'Need another MRS in this period to see a trend';
  }

  const energySignals = inRange
    .map((c) => getDailySignal(c))
    .filter((n): n is number => n != null);
  const energyAverage = average(energySignals);

  const latestChannelSubtext = latest
    ? [
        latest.mood_level != null ? `Mood ${latest.mood_level}` : null,
        latest.sleep_quality != null ? `Sleep ${latest.sleep_quality}/5` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return {
    mrsValue: latestMrs
      ? latestMrs.total_score
      : latestPartialMrs
        ? 'Incomplete check-in'
        : '—',
    mrsSubtext: latestMrs
      ? mrsAverage != null
        ? `avg ${formatAvg(mrsAverage)} this period · Psych ${latestMrs.psychological_score ?? '—'} · Som ${latestMrs.somatic_score ?? '—'} · Uro ${latestMrs.urogenital_score ?? '—'}`
        : `/44 · Psych ${latestMrs.psychological_score ?? '—'} · Som ${latestMrs.somatic_score ?? '—'} · Uro ${latestMrs.urogenital_score ?? '—'}`
      : latestPartialMrs
        ? 'Finish your check-in to see a score'
        : '/44',
    energyValue: energyAverage != null ? formatAvg(energyAverage) : '—',
    energySubtext:
      energySignals.length > 1
        ? `avg over this period${latestChannelSubtext ? ` · latest ${latestChannelSubtext}` : ''}`
        : latestChannelSubtext || '/5',
    burdenHeadline,
    burdenDetail,
    burdenImproving,
    daysLogged: new Set(inRange.map((c) => c.checkin_date)).size,
  };
}
