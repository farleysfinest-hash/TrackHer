import type { Medication, MedicationChange, SymptomCheckin, MedicationAdministration } from '../types/database';
import { daysBetweenISO } from '../utils/localDate';
import { getDailySignal } from '../utils/checkinHelpers';

export interface WellbeingSignalInput {
  checkins: SymptomCheckin[];
  medicationChanges: MedicationChange[];
  medications: Medication[];
  administrations: MedicationAdministration[];
  timezone: string;
}

// sleep_quality collected from slice 12 onward; mood_level from slice 15 onward.
// Sleep-lag analysis (night sweats -> sleep -> next-day energy) is queued for the AI layer / a future analyzer.

export const WINDOW_DAYS = 21;
export const WELLBEING_DOSE_MIN_POINTS = 4;
export const VOLATILITY_LOOKBACK_DAYS = 21;
export const VOLATILITY_MIN_POINTS = 10;
export const VOLATILITY_THRESHOLD = 1.25;
export const MOOD_VOLATILITY_THRESHOLD = 1.5;
export const TROUGH_LOOKBACK_DAYS = 60;
export const TROUGH_MIN_CYCLES = 3;
export const TROUGH_MIN_AVG_POINTS_PER_POSITION = 2;
export const TROUGH_MIN_GAP = 1;
export const TROUGH_MIN_ADMINISTRATIONS = 3;

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function dailySignalSeries(checkins: SymptomCheckin[]) {
  return [...checkins]
    .map((c) => {
      const value = getDailySignal(c);
      return value !== null ? { date: c.checkin_date, value } : null;
    })
    .filter((p): p is { date: string; value: number } => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function moodSeries(checkins: SymptomCheckin[]) {
  return [...checkins]
    .filter((c) => c.mood_level !== null && c.mood_level !== undefined)
    .map((c) => ({ date: c.checkin_date, value: Number(c.mood_level) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function daysBetween(from: string, to: string): number {
  return daysBetweenISO(from, to);
}
