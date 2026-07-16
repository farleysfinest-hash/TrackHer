import { describe, expect, it } from 'vitest';
import { getDateRangeFromPreset } from '../dashboardStore';

describe('dashboard date-range presets', () => {
  const end = '2026-07-15';

  it('returns exactly 30 and 90 inclusive calendar dates', () => {
    expect(getDateRangeFromPreset('30d', end)).toEqual({ start: '2026-06-16', end });
    expect(getDateRangeFromPreset('90d', end)).toEqual({ start: '2026-04-17', end });
  });

  it('uses calendar months rather than fixed day approximations', () => {
    expect(getDateRangeFromPreset('6mo', end)).toEqual({ start: '2026-01-15', end });
    expect(getDateRangeFromPreset('1yr', end)).toEqual({ start: '2025-07-15', end });
  });

  it('clamps month-end dates correctly', () => {
    expect(getDateRangeFromPreset('6mo', '2026-08-31')).toEqual({
      start: '2026-02-28',
      end: '2026-08-31',
    });
  });
});
