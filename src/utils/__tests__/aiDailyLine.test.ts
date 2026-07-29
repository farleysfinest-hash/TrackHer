import { describe, expect, it } from 'vitest';
import { clampDailyLine, dailyLineCacheKey, shouldSkipDailyLine } from '../aiDailyLine';

describe('clampDailyLine', () => {
  it('caps at 140 and collapses whitespace', () => {
    const long = 'x'.repeat(200);
    expect(clampDailyLine(`  hello   world  ${long}`)?.length).toBe(140);
  });

  it('returns null for empty', () => {
    expect(clampDailyLine('   ')).toBeNull();
  });
});

describe('dailyLineCacheKey', () => {
  it('includes local date and facts hash', () => {
    expect(dailyLineCacheKey('2026-07-29', 'abc')).toBe('2026-07-29:abc');
  });
});

describe('shouldSkipDailyLine', () => {
  it('skips empty packets', () => {
    expect(shouldSkipDailyLine({ mrsCount: 0, pulseCount: 0, medCount: 0 })).toBe(true);
    expect(shouldSkipDailyLine({ mrsCount: 1, pulseCount: 0, medCount: 0 })).toBe(false);
  });
});
