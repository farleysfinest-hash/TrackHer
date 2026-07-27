import { describe, expect, it } from 'vitest';
import {
  STORY_CHART_MIN_SPAN_DAYS,
  STORY_CHART_PAD_BEFORE,
  storyChartWindow,
} from '../earlyStoryChartWindow';

describe('storyChartWindow', () => {
  const preset90 = { start: '2026-04-17', end: '2026-07-26' };

  it('floors a single recent check-in to ~4 weeks ending today', () => {
    expect(storyChartWindow(preset90, ['2026-07-26'])).toEqual({
      start: '2026-06-29',
      end: '2026-07-26',
    });
  });

  it('widens left as check-in history grows past the floor', () => {
    // First check-in 40 days before end → start = first − pad (wider than floor)
    expect(storyChartWindow(preset90, ['2026-06-16', '2026-07-26'])).toEqual({
      start: '2026-06-09',
      end: '2026-07-26',
    });
  });

  it('opens to the full preset once history reaches it', () => {
    expect(storyChartWindow(preset90, ['2026-04-20', '2026-07-26'])).toEqual({
      start: '2026-04-17',
      end: '2026-07-26',
    });
  });

  it('never starts before the dashboard preset', () => {
    const tight = { start: '2026-07-20', end: '2026-07-26' };
    expect(storyChartWindow(tight, ['2026-07-26']).start).toBe('2026-07-20');
  });

  it('uses the floor window when there are no check-in dates', () => {
    expect(storyChartWindow(preset90, [])).toEqual({
      start: '2026-06-29',
      end: '2026-07-26',
    });
  });

  it('documents the inclusive span constants', () => {
    expect(STORY_CHART_MIN_SPAN_DAYS).toBe(27);
    expect(STORY_CHART_PAD_BEFORE).toBe(7);
  });
});
