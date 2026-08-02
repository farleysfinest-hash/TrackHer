import type { DateRange } from '../stores/dashboardStore';
import { addDaysISO, daysBetweenISO } from './localDate';

/** Floor window (~4 weeks) so a single recent check-in is not a stub axis. */
export const STORY_CHART_MIN_SPAN_DAYS = 27;

/** Days before the first check-in for left breathing room. */
export const STORY_CHART_PAD_BEFORE = 7;

/**
 * Progressive story / subscale domain: follow check-in density, then widen
 * toward the dashboard preset. Medication history never stretches the axis —
 * lanes clip into this window instead.
 *
 * - Sparse (1 recent point): ~4 weeks ending today
 * - Growing history: start walks left with first check-in − pad
 * - Dense enough: open to the full preset (30d / 90d / …)
 */
export function storyChartWindow(
  dateRange: DateRange,
  checkinDates: string[],
): DateRange {
  const end = dateRange.end;
  const minStart = addDaysISO(end, -STORY_CHART_MIN_SPAN_DAYS);

  if (checkinDates.length === 0) {
    const start = minStart < dateRange.start ? dateRange.start : minStart;
    return { start, end };
  }

  const first = [...checkinDates].sort((a, b) => a.localeCompare(b))[0];
  const paddedFirst = addDaysISO(first, -STORY_CHART_PAD_BEFORE);

  // Follow the data (progressive widen), but never tighter than the floor window.
  let start = paddedFirst < minStart ? paddedFirst : minStart;

  if (start < dateRange.start) start = dateRange.start;
  if (start > end) start = end;

  if (daysBetweenISO(start, end) < 0) return dateRange;

  return { start, end };
}
