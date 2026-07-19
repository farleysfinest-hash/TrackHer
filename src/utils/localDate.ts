/**
 * Calendar-date and timezone helpers.
 *
 * YYYY-MM-DD values are civil dates: they have no time or timezone. Timestamp values are exact
 * instants and must be converted through an explicit IANA timezone before they are grouped by day.
 */

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export interface CivilDateParts {
  year: number;
  month: number;
  day: number;
}

export interface EventLocalMetadata {
  timezone: string;
  localDate: string;
  utcOffsetMinutes: number;
}

export function parseISODate(dateStr: string): CivilDateParts {
  const match = ISO_DATE_PATTERN.exec(dateStr);
  if (!match) throw new RangeError(`Invalid calendar date: ${dateStr}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date: ${dateStr}`);
  }
  return { year, month, day };
}

/**
 * True when the string is a complete, real YYYY-MM-DD calendar date. Never throws —
 * safe to call in render on raw <input type="date"> values, which pass through
 * intermediate states (empty string, or year-in-progress values like "0002-12-15")
 * while the user types. parseISODate's century check rejects those intermediates.
 */
export function isValidCalendarDate(dateStr: string | null | undefined): dateStr is string {
  if (!dateStr) return false;
  try {
    parseISODate(dateStr);
    return true;
  } catch {
    return false;
  }
}

export function formatISODateParts({ year, month, day }: CivilDateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Date object used only to format a civil date without applying a local timezone shift. */
export function civilDateToUTCDate(dateStr: string): Date {
  const { year, month, day } = parseISODate(dateStr);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Monotonic integer day for timezone-free calendar comparisons and chart positioning. */
export function civilDateOrdinal(dateStr: string): number {
  return civilDateToUTCDate(dateStr).getTime() / MS_PER_DAY;
}

/** YYYY-MM-DD for a Date in the runtime device timezone. */
export function toLocalISODate(date: Date): string {
  return formatISODateParts({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

export function isValidTimeZone(timezone: string | null | undefined): timezone is string {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function getDeviceTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(timezone) ? timezone : null;
  } catch {
    return null;
  }
}

/**
 * Active timezone for "today" and new events. The current device wins so travel does not leave
 * the user stuck in their preferred/home timezone. The preference is a fallback, never rewritten.
 */
export function getActiveTimezone(preferredTimezone?: string | null): string {
  return getDeviceTimezone() ?? (isValidTimeZone(preferredTimezone) ? preferredTimezone : 'UTC');
}

export function getSupportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    const fallback = getDeviceTimezone();
    return fallback ? [fallback, 'UTC'] : ['UTC'];
  }
}

function zonedParts(instant: Date, timezone: string): Required<CivilDateParts> & {
  hour: number;
  minute: number;
  second: number;
} {
  if (!isValidTimeZone(timezone)) throw new RangeError(`Invalid IANA timezone: ${timezone}`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function dateISOInTimeZone(instant: Date | string, timezone: string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid timestamp: ${String(instant)}`);
  return formatISODateParts(zonedParts(date, timezone));
}

export function hourInTimeZone(instant: Date | string, timezone: string): number {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid timestamp: ${String(instant)}`);
  return zonedParts(date, timezone).hour;
}

/** Prefer immutable event-local metadata; infer legacy rows in the explicitly supplied zone. */
export function resolveEventLocalDate(
  timestamp: string,
  localDate: string | null | undefined,
  eventTimezone: string | null | undefined,
  fallbackTimezone: string,
): string {
  if (localDate) return localDate;
  return dateISOInTimeZone(
    timestamp,
    isValidTimeZone(eventTimezone) ? eventTimezone : fallbackTimezone,
  );
}

export function getEventLocalMetadata(
  instant: Date | string,
  timezone = getActiveTimezone(),
): EventLocalMetadata {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid timestamp: ${String(instant)}`);
  const parts = zonedParts(date, timezone);
  const representedAsUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const instantAtWholeSecond = Math.floor(date.getTime() / 1000) * 1000;
  return {
    timezone,
    localDate: formatISODateParts(parts),
    utcOffsetMinutes: Math.round((representedAsUTC - instantAtWholeSecond) / 60_000),
  };
}

/** Today's calendar date in an explicit zone, or the current device zone when omitted. */
export function todayISO(timezone = getActiveTimezone(), now = new Date()): string {
  return dateISOInTimeZone(now, timezone);
}

/** Shift a YYYY-MM-DD civil date by whole calendar days. */
export function addDaysISO(dateStr: string, delta: number): string {
  const date = civilDateToUTCDate(dateStr);
  date.setUTCDate(date.getUTCDate() + delta);
  return formatISODateParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

/** Signed whole calendar days from `from` to `to`. */
export function daysBetweenISO(from: string, to: string): number {
  return civilDateOrdinal(to) - civilDateOrdinal(from);
}

/** Add calendar months, clamping the day to the last valid day in the target month. */
export function addMonthsISO(dateStr: string, months: number): string {
  const { year, month, day } = parseISODate(dateStr);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return formatISODateParts({
    year: targetYear,
    month: normalizedMonth + 1,
    day: Math.min(day, lastDay),
  });
}

/** Calendar months elapsed from `fromDate` to `toDate` (both YYYY-MM-DD). */
export function calendarMonthsBetween(fromDate: string, toDate: string): number {
  const from = parseISODate(fromDate);
  const to = parseISODate(toDate);
  let months = (to.year - from.year) * 12 + (to.month - from.month);
  if (to.day < from.day) months -= 1;
  return Math.max(0, months);
}

/** Day-of-week for a civil date: 0 = Sunday … 6 = Saturday. */
export function dayOfWeekISO(dateStr: string): number {
  return civilDateToUTCDate(dateStr).getUTCDay();
}

/** Human-readable civil date for insight copy, e.g. "3 June". */
export function formatEventDateShort(dateStr: string): string {
  return civilDateToUTCDate(dateStr).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}
