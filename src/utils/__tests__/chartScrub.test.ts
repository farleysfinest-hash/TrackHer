import { describe, expect, it } from 'vitest';
import { nearestDateForRatio } from '../chartScrub';

describe('nearestDateForRatio', () => {
  const domain = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'];

  it('resolves to the nearest available point within a sparse date domain', () => {
    const available = ['2026-01-01', '2026-01-05'];
    expect(nearestDateForRatio(available, domain, 0.4)).toBe('2026-01-01');
    expect(nearestDateForRatio(available, domain, 0.7)).toBe('2026-01-05');
  });

  it('clamps positions outside the plot', () => {
    expect(nearestDateForRatio(domain, domain, -1)).toBe('2026-01-01');
    expect(nearestDateForRatio(domain, domain, 2)).toBe('2026-01-05');
  });

  it('returns null without selectable dates', () => {
    expect(nearestDateForRatio([], domain, 0.5)).toBeNull();
  });
});
