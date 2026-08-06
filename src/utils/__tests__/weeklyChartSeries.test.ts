import { describe, expect, it } from 'vitest';
import { buildDailyIndexedWeeklyChart } from '../weeklyChartSeries';
import { addDaysISO } from '../localDate';

describe('buildDailyIndexedWeeklyChart axis downsampling', () => {
  function makeRow(date: string, value: number) {
    return { date, mrsTotal: value };
  }

  it('uses daily axis for ranges ≤ 90 days', () => {
    const start = '2026-01-01';
    const end = '2026-03-31'; // 89 days
    const sparse = [makeRow('2026-01-07', 10), makeRow('2026-02-04', 20)];

    const result = buildDailyIndexedWeeklyChart(sparse, start, end, ['mrsTotal']);
    // Daily axis: one row per day = 90 rows (Jan 1 to Mar 31 inclusive)
    expect(result.dailyRows.length).toBe(90);
  });

  it('downsamples axis for ranges > 90 days', () => {
    const start = '2026-01-01';
    const end = '2026-12-31'; // 364 days
    const sparse = [makeRow('2026-03-15', 10), makeRow('2026-09-20', 30)];

    const result = buildDailyIndexedWeeklyChart(sparse, start, end, ['mrsTotal']);
    // Weekly grid ≈ 53 dates + 2 sparse dates merged in → well under 365
    expect(result.dailyRows.length).toBeLessThan(100);
    expect(result.dailyRows.length).toBeGreaterThan(40);
  });

  it('preserves all sparse data points after downsampling', () => {
    const start = '2026-01-01';
    const end = '2026-07-01'; // ~181 days, > 90
    const sparseDates = ['2026-01-10', '2026-02-14', '2026-04-03', '2026-06-20'];
    const sparse = sparseDates.map((d, i) => makeRow(d, (i + 1) * 10));

    const result = buildDailyIndexedWeeklyChart(sparse, start, end, ['mrsTotal']);
    const resultDates = result.dailyRows.map((r) => r.date);

    // Every sparse date must appear in the output
    for (const d of sparseDates) {
      expect(resultDates).toContain(d);
    }

    // And the values must be present
    const row = result.dailyRows.find((r) => r.date === '2026-02-14');
    expect((row as Record<string, unknown>).mrsTotal).toBe(20);
  });

  it('keeps segment stroke-breaking logic intact after downsampling', () => {
    const start = '2026-01-01';
    const end = '2026-06-30'; // ~180 days
    // Two clusters separated by a 3-week gap (> WEEKLY_GAP_BREAK_DAYS=11)
    const sparse = [
      makeRow('2026-01-07', 10),
      makeRow('2026-01-14', 12),
      // gap
      makeRow('2026-03-01', 20),
      makeRow('2026-03-08', 22),
    ];

    const result = buildDailyIndexedWeeklyChart(sparse, start, end, ['mrsTotal']);
    expect(result.weeklySegmentKeys.mrsTotal).toHaveLength(2);
    expect(result.gapNotices).toHaveLength(1);
  });

  it('includes windowStart and windowEnd in downsampled output', () => {
    const start = '2026-01-01';
    const end = '2026-12-31';
    const sparse = [makeRow('2026-06-15', 25)];

    const result = buildDailyIndexedWeeklyChart(sparse, start, end, ['mrsTotal']);
    const dates = result.dailyRows.map((r) => r.date);
    expect(dates[0]).toBe(start);
    expect(dates[dates.length - 1]).toBe(end);
  });
});
