import type { Profile } from '../types/database';
import type { Insight } from '../engine/types';
import type { MRSSeverityBandInfo } from './checkinHelpers';
import { getLocalDateISO } from './checkinHelpers';
import { addDaysISO, getMedicationChangeLabel } from './medicationHelpers';
import type { MedicationChangeWithMed } from '../hooks/useMedicationChanges';
import { formatDateLong } from './formatters';
import { daysBetweenISO } from './localDate';

const EXPERIMENT_WINDOW_DAYS = 21;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function daysBetween(from: string, to: string): number {
  return daysBetweenISO(from, to);
}

export function formatMrsDeltaLine(
  currentTotal: number,
  previousTotal: number | null,
  isBackdated: boolean,
): string {
  if (isBackdated) {
    return 'Logged retroactively — trend comparison skipped.';
  }
  if (previousTotal === null) {
    return 'This is your first scored check-in on the scale.';
  }
  const diff = currentTotal - previousTotal;
  if (diff === 0) return 'Unchanged from your last check-in.';
  const direction = diff < 0 ? 'down' : 'up';
  return `${direction} ${Math.abs(diff)} from your last check-in`;
}

export function formatMrsHeadline(
  total: number,
  band: MRSSeverityBandInfo,
  deltaLine: string,
): string {
  return `${total} — ${band.bandLabel} range, ${deltaLine.charAt(0).toLowerCase()}${deltaLine.slice(1)}`;
}

export function getStrongestInsightPhrase(insights: Insight[]): string | null {
  if (insights.length === 0) return null;
  const top = insights[0];
  return top.body || top.title;
}

export function getCoverageFallbackPhrase(mrsCheckinCount: number): string {
  return `That's ${mrsCheckinCount} check-in${mrsCheckinCount === 1 ? '' : 's'} logged — the engine is building your baseline.`;
}

export function getActiveExperimentReadout(
  changes: MedicationChangeWithMed[],
  timezone: string,
): { headline: string; body: string } | null {
  const today = getLocalDateISO(timezone);
  const active =
    changes
      .filter((c) => {
        if (c.change_type === 'stopped' || !c.medication) return false;
        const elapsed = daysBetween(c.change_date, today);
        return elapsed >= 0 && elapsed < EXPERIMENT_WINDOW_DAYS;
      })
      .sort((a, b) => b.change_date.localeCompare(a.change_date))[0] ?? null;

  if (!active?.medication) return null;

  const elapsed = daysBetween(active.change_date, today);
  const daysRemaining = EXPERIMENT_WINDOW_DAYS - elapsed;
  const readoutDate = addDaysISO(active.change_date, EXPERIMENT_WINDOW_DAYS);
  const changeLabel = getMedicationChangeLabel(active, active.medication);

  if (daysRemaining <= 0) {
    return {
      headline: 'Your dose-change readout is due',
      body: `The 21-day window after your ${changeLabel} on ${formatDateLong(active.change_date)} has closed — your readout should appear in Insights when the data supports one.`,
    };
  }

  return {
    headline: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} until your readout`,
    body: `You're in a dose-change window after ${changeLabel} on ${formatDateLong(active.change_date)}. Your readout arrives ${formatDateLong(readoutDate)}.`,
  };
}

export function getNextRhythmReadout(profile: Profile | null): { headline: string; body: string } {
  const frequency = profile?.checkin_frequency ?? 'weekly';

  if (frequency === 'daily') {
    return {
      headline: 'Keep your daily pulse going',
      body: 'A quick tap most days keeps patterns visible — full weekly check-ins capture the bigger picture.',
    };
  }

  const checkinDay = profile?.checkin_day;
  if (checkinDay != null && checkinDay >= 0 && checkinDay <= 6) {
    return {
      headline: `Your rhythm: weekly on ${DAY_NAMES[checkinDay]}s`,
      body: `Your next full check-in fits best on ${DAY_NAMES[checkinDay]} — rate the past week while it's still fresh.`,
    };
  }

  return {
    headline: 'Your rhythm: about once a week',
    body: 'A weekly check-in captures how the past seven days actually felt — whenever that works for you.',
  };
}
