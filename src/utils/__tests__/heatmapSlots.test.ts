import { describe, expect, it } from 'vitest';
import {
  HEATMAP_SLOT_COUNT,
  heatmapRangeCaption,
  padHeatmapSlots,
} from '../heatmapSlots';

describe('padHeatmapSlots', () => {
  it('pads a single check-in to eight slots', () => {
    const cells = padHeatmapSlots([
      { date: '2026-07-26', dateLabel: 'Jul 26', score: 3 },
    ]);
    expect(cells).toHaveLength(HEATMAP_SLOT_COUNT);
    expect(cells[0]).toMatchObject({ date: '2026-07-26', score: 3, placeholder: false });
    expect(cells.slice(1).every((c) => c.placeholder && c.score === null)).toBe(true);
  });

  it('keeps the most recent slots when over capacity', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, '0')}`,
      dateLabel: `May ${i + 1}`,
      score: 1 as number | null,
    }));
    const cells = padHeatmapSlots(many);
    expect(cells).toHaveLength(8);
    expect(cells.every((c) => !c.placeholder)).toBe(true);
    expect(cells[0].date).toBe('2026-05-03');
    expect(cells[7].date).toBe('2026-05-10');
  });

  it('all placeholders when empty', () => {
    const cells = padHeatmapSlots([]);
    expect(cells).toHaveLength(8);
    expect(cells.every((c) => c.placeholder)).toBe(true);
  });
});

describe('heatmapRangeCaption', () => {
  it('describes empty engagement slots', () => {
    expect(heatmapRangeCaption(padHeatmapSlots([]))).toContain('empties fill');
  });

  it('counts filled slots before capacity', () => {
    const cells = padHeatmapSlots([
      { date: '2026-07-26', dateLabel: 'Jul 26', score: 2 },
    ]);
    expect(heatmapRangeCaption(cells)).toContain('1 of 8 slots');
  });
});
