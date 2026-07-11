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

/** Today's date in the user's local timezone, as YYYY-MM-DD. */
export function todayISO(): string {
  return toLocalISODate(new Date());
}

/** Shift a YYYY-MM-DD string by whole days, staying in local time. */
export function addDaysISO(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toLocalISODate(new Date(y, m - 1, d + delta));
}
