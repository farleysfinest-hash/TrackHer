import { addDaysISO } from '../utils/localDate';

export const WINDOW_DAYS_DEFAULT = 21;
export const WINDOW_DAYS_MAX = 28;

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function pooledStdDev(before: number[], after: number[]): number {
  const n1 = before.length;
  const n2 = after.length;
  if (n1 < 2 && n2 < 2) return 0;
  if (n1 < 2) return stdDev(after);
  if (n2 < 2) return stdDev(before);

  const mean1 = before.reduce((sum, v) => sum + v, 0) / n1;
  const mean2 = after.reduce((sum, v) => sum + v, 0) / n2;
  const var1 = before.reduce((sum, v) => sum + (v - mean1) ** 2, 0) / (n1 - 1);
  const var2 = after.reduce((sum, v) => sum + (v - mean2) ** 2, 0) / (n2 - 1);
  const pooled = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
  return Math.sqrt(pooled);
}

export interface BeforeAfterWindows<T> {
  windowDays: number;
  before: T[];
  after: T[];
}

export function collectBeforeAfterWindows<T extends { checkin_date: string }>(
  items: T[],
  changeDate: string,
  minPerArm: number,
): BeforeAfterWindows<T> | null {
  for (const windowDays of [WINDOW_DAYS_DEFAULT, WINDOW_DAYS_MAX]) {
    const beforeStart = addDaysISO(changeDate, -windowDays);
    const afterEnd = addDaysISO(changeDate, windowDays);
    const before = items.filter(
      (c) => c.checkin_date >= beforeStart && c.checkin_date < changeDate,
    );
    const after = items.filter(
      (c) => c.checkin_date > changeDate && c.checkin_date <= afterEnd,
    );
    if (before.length >= minPerArm && after.length >= minPerArm) {
      return { windowDays, before, after };
    }
  }
  return null;
}

export function passesMrsDoseEffectFloor(
  beforeScores: number[],
  afterScores: number[],
  totalDelta: number,
): boolean {
  if (beforeScores.length < 4 || afterScores.length < 4) return false;

  const beforeStd = stdDev(beforeScores);
  const afterStd = stdDev(afterScores);
  if (
    (beforeScores.length < 4 && beforeStd === 0) ||
    (afterScores.length < 4 && afterStd === 0)
  ) {
    return false;
  }

  const pooled = pooledStdDev(beforeScores, afterScores);
  const floor = Math.max(4, 1.0 * pooled);
  return Math.abs(totalDelta) >= floor;
}

export function passesScalarDoseEffectFloor(
  beforeValues: number[],
  afterValues: number[],
  delta: number,
  minAbsolute: number,
): boolean {
  if (beforeValues.length < 4 || afterValues.length < 4) return false;

  const beforeStd = stdDev(beforeValues);
  const afterStd = stdDev(afterValues);
  if (
    (beforeValues.length < 4 && beforeStd === 0) ||
    (afterValues.length < 4 && afterStd === 0)
  ) {
    return false;
  }

  const pooled = pooledStdDev(beforeValues, afterValues);
  const floor = Math.max(minAbsolute, 1.0 * pooled);
  return Math.abs(delta) >= floor;
}

export function windowWeeksLabel(windowDays: number): string {
  const weeks = Math.round(windowDays / 7);
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}
