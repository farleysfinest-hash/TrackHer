import { describe, expect, it } from 'vitest';
import { clampDoseWatchPack, doseWatchCacheKey } from '../aiDoseWatch';

describe('clampDoseWatchPack', () => {
  it('returns null without note', () => {
    expect(clampDoseWatchPack({ watchFor: ['sleep'] })).toBeNull();
  });

  it('clamps watchFor to 4', () => {
    const pack = clampDoseWatchPack({
      note: 'Some women notice sleep shifts in the first two weeks.',
      watchFor: ['a', 'b', 'c', 'd', 'e', ''],
    });
    expect(pack?.watchFor).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('doseWatchCacheKey', () => {
  it('normalizes med name case', () => {
    expect(doseWatchCacheKey('2026-07-01', 'Estradiol')).toBe(
      doseWatchCacheKey('2026-07-01', 'estradiol'),
    );
  });
});
