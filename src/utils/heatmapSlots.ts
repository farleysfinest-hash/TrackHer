import { formatChartDate } from './chartHelpers';

/** Fixed engagement slots on the symptom heatmap (filled + empty greys). */
export const HEATMAP_SLOT_COUNT = 8;

export interface HeatmapCell {
  date: string;
  dateLabel: string;
  score: number | null;
  /** Future engagement slot — not a real check-in day. */
  placeholder?: boolean;
}

/**
 * Keep up to `slotCount` real check-in columns, then pad with empty future
 * slots so a single day does not stretch into one fat stripe.
 */
export function padHeatmapSlots(
  cells: Array<{ date: string; dateLabel: string; score: number | null }>,
  slotCount = HEATMAP_SLOT_COUNT,
): HeatmapCell[] {
  const filled = cells.slice(-slotCount).map((cell) => ({ ...cell, placeholder: false as const }));
  const missing = Math.max(0, slotCount - filled.length);
  const placeholders: HeatmapCell[] = Array.from({ length: missing }, (_, i) => ({
    date: `__slot_${filled.length + i}`,
    dateLabel: '',
    score: null,
    placeholder: true,
  }));
  return [...filled, ...placeholders];
}

export function heatmapRangeCaption(cells: HeatmapCell[]): string {
  const filled = cells.filter((c) => !c.placeholder);
  if (filled.length === 0) {
    return `Worst symptoms at top · ${HEATMAP_SLOT_COUNT} weekly slots · empties fill as you check in`;
  }
  const first = filled[0].date;
  const last = filled[filled.length - 1].date;
  const when =
    first === last ? formatChartDate(first) : `${formatChartDate(first)} – ${formatChartDate(last)}`;
  if (filled.length >= HEATMAP_SLOT_COUNT) {
    return `Worst symptoms at top · last ${filled.length} check-ins · ${when}`;
  }
  return `Worst symptoms at top · ${filled.length} of ${HEATMAP_SLOT_COUNT} slots · ${when}`;
}
