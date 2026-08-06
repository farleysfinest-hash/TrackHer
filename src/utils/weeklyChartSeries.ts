import { addDaysISO, daysBetweenISO, formatEventDateShort } from './localDate';
import { formatChartDate } from './chartHelpers';

/** Gaps longer than this between consecutive weekly check-ins break the stroke. */
export const WEEKLY_GAP_BREAK_DAYS = 11;

export interface WeeklyGapNotice {
  afterDate: string;
  beforeDate: string;
  message: string;
}

export function formatWeeklyGapNotice(afterDate: string, beforeDate: string): string {
  return `No check-in logged between ${formatEventDateShort(afterDate)} and ${formatEventDateShort(beforeDate)}.`;
}

export function segmentDataKey(baseKey: string, segmentIndex: number): string {
  return `${baseKey}__wseg${segmentIndex}`;
}

function enumerateAxisDates(start: string, end: string, step = 1): string[] {
  if (start > end) return [];
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDaysISO(cur, step);
  }
  // Always include the end date so the axis spans the full window.
  if (step > 1 && dates.length > 0 && dates[dates.length - 1] !== end) {
    dates.push(end);
  }
  return dates;
}

/**
 * For ranges > 90 days the daily-indexed axis creates far more DOM nodes than
 * data points (365 nodes for ~52 weekly check-ins at 1yr). Step the grid by 7
 * for long ranges and merge in the actual measurement dates so no data is lost.
 */
const DOWNSAMPLE_THRESHOLD_DAYS = 90;

export function weeklyMeasurementDates(
  rows: Array<{ date: string; [key: string]: unknown }>,
  valueKey: string,
): string[] {
  return rows
    .filter((row) => row[valueKey] !== null && row[valueKey] !== undefined)
    .map((row) => row.date)
    .sort((a, b) => a.localeCompare(b));
}

export function splitWeeklyMeasurementDates(
  dates: string[],
  gapThreshold = WEEKLY_GAP_BREAK_DAYS,
): { segments: string[][]; gaps: WeeklyGapNotice[] } {
  if (dates.length === 0) return { segments: [], gaps: [] };

  const segments: string[][] = [[dates[0]]];
  const gaps: WeeklyGapNotice[] = [];

  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const cur = dates[i];
    if (daysBetweenISO(prev, cur) > gapThreshold) {
      gaps.push({
        afterDate: prev,
        beforeDate: cur,
        message: formatWeeklyGapNotice(prev, cur),
      });
      segments.push([cur]);
    } else {
      segments[segments.length - 1].push(cur);
    }
  }

  return { segments, gaps };
}

export interface DailyIndexedWeeklyChart<T extends { date: string }> {
  dailyRows: Array<T & { date: string; dateLabel: string; gapNotice?: string }>;
  weeklySegmentKeys: Record<string, string[]>;
  gapNotices: WeeklyGapNotice[];
}

/**
 * Expand sparse weekly measurements onto a daily-indexed axis, then assign
 * per-segment data keys so missed weeks break the stroke while connectNulls
 * still bridges the six structural nulls between normal weekly points.
 */
export function buildDailyIndexedWeeklyChart<T extends { date: string }>(
  sparseRows: T[],
  windowStart: string,
  windowEnd: string,
  weeklyValueKeys: string[],
): DailyIndexedWeeklyChart<T> {
  const sparseByDate = new Map(sparseRows.map((row) => [row.date, row]));
  const rangeDays = daysBetweenISO(windowStart, windowEnd);
  const step = rangeDays > DOWNSAMPLE_THRESHOLD_DAYS ? 7 : 1;
  const gridDates = enumerateAxisDates(windowStart, windowEnd, step);

  // When stepping > 1, merge in sparse data dates so measurements that fall
  // between grid ticks are not silently dropped.
  let days: string[];
  if (step > 1) {
    const dateSet = new Set(gridDates);
    for (const row of sparseRows) {
      if (row.date >= windowStart && row.date <= windowEnd) {
        dateSet.add(row.date);
      }
    }
    days = [...dateSet].sort();
  } else {
    days = gridDates;
  }

  const weeklySegmentKeys: Record<string, string[]> = {};
  const allGaps: WeeklyGapNotice[] = [];
  const gapNoticeByDate = new Map<string, string>();

  const segmentDatesByKey = new Map<string, string[][]>();

  for (const key of weeklyValueKeys) {
    const measureDates = weeklyMeasurementDates(
      sparseRows as Array<{ date: string; [key: string]: unknown }>,
      key,
    );
    const { segments, gaps } = splitWeeklyMeasurementDates(measureDates);
    weeklySegmentKeys[key] = segments.map((_, index) => segmentDataKey(key, index));
    segmentDatesByKey.set(key, segments);
    for (const gap of gaps) {
      allGaps.push(gap);
      gapNoticeByDate.set(gap.beforeDate, gap.message);
    }
  }

  const dailyRows = days.map((date) => {
    const sparse = sparseByDate.get(date);
    const row = {
      ...(sparse ?? ({ date } as T)),
      date,
      dateLabel: formatChartDate(date),
    } as T & { date: string; dateLabel: string; gapNotice?: string };

    for (const key of weeklyValueKeys) {
      const rawValue =
        sparse && sparse[key as keyof T] !== undefined
          ? (sparse[key as keyof T] as number | null)
          : null;
      (row as Record<string, unknown>)[key] = rawValue ?? null;

      const segments = segmentDatesByKey.get(key) ?? [];
      segments.forEach((segDates, segIdx) => {
        const segKey = segmentDataKey(key, segIdx);
        (row as Record<string, unknown>)[segKey] = segDates.includes(date) ? rawValue : null;
      });
    }

    const notice = gapNoticeByDate.get(date);
    if (notice) row.gapNotice = notice;

    return row;
  });

  return { dailyRows, weeklySegmentKeys, gapNotices: allGaps };
}

export function weeklyChartWindow(
  dates: string[],
  fallbackStart: string,
  fallbackEnd: string,
): { start: string; end: string } {
  if (dates.length === 0) return { start: fallbackStart, end: fallbackEnd };
  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  return {
    start: sorted[0] < fallbackStart ? sorted[0] : fallbackStart,
    end: sorted[sorted.length - 1] > fallbackEnd ? sorted[sorted.length - 1] : fallbackEnd,
  };
}
