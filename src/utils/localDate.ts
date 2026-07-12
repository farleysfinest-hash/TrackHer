/**
 * Local-date helpers.
 *
 * NEVER use `toISOString().split('T')[0]` to produce a YYYY-MM-DD string.
 * `toISOString()` converts to UTC, so a 6pm check-in in California is stamped
 * with tomorrow's date. All calendar dates in this app are the USER'S local
 * dates — her day, not UTC's day.
 */

/** YYYY-MM-DD for a Date, in the user's local timezone. */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Today's calendar date as YYYY-MM-DD.
 * When `timezone` is set (IANA, e.g. from profile), uses that zone — not UTC.
 */
export function todayISO(timezone?: string): string {
  if (timezone) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  }
  return toLocalISODate(new Date());
}

/** Shift a YYYY-MM-DD string by whole days (calendar math, noon anchor). */
export function addDaysISO(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toLocalISODate(new Date(y, m - 1, d + delta));
}

/** Whole calendar days from `from` to `to` (YYYY-MM-DD), inclusive-friendly via noon anchor. */
export function daysBetweenISO(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Add whole months to a calendar date, clamping the day to the last valid day
 * of the target month (Jan 31 + 1 month → Feb 28/29, not Mar 3).
 */
export function addMonthsISO(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetMonthIndex = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const clampedDay = Math.min(d, lastDay);
  return toLocalISODate(new Date(targetYear, normalizedMonth, clampedDay));
}

/** Calendar months elapsed from `fromDate` to `toDate` (both YYYY-MM-DD). */
export function calendarMonthsBetween(fromDate: string, toDate: string): number {
  const [y1, m1, d1] = fromDate.split('-').map(Number);
  const [y2, m2, d2] = toDate.split('-').map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  return Math.max(0, months);
}

/** Day-of-week for a calendar date: 0 = Sunday … 6 = Saturday. */
export function dayOfWeekISO(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

/** Human-readable event date for insight update copy, e.g. "3 June". */
export function formatEventDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
}
