import type { MRSScore } from '../types/database';
import { civilDateToUTCDate } from './localDate';

/** Chart palette — aligned with soft blush theme (#BE739A) */
export const CHART_COLORS = {
  mrsTotal: '#7a3b5e',
  mrsTotalDot: '#a64d79',
  wellbeing: '#c989a7',
  /** MRS subscale line ramp: deep rose → raspberry → light blush */
  psychological: '#7a3b5e',
  somatic: '#a64d79',
  urogenital: '#e0a8c6',
  optimalBand: '#e5aac8',
  conventionalBand: '#dfaec7',
  outOfRange: '#7a3b5e',
  estrogen: '#a64d79',
  progesterone: '#c989a7',
  testosterone: '#7a3b5e',
  combination: '#be739a',
  supportive: '#dfaec7',
  other: '#dfaec7',
  changeLine: '#ce93ad',
  grid: '#f0eaec',
  axisText: '#b896a3',
} as const;

/**
 * Medication lane: colour encodes CATEGORY (identity), depth encodes dose state.
 * A dose increase deepens the bar WITHIN its own category tone — a progesterone
 * bar never turns into estrogen's ink. `base` = continuous / pre-change dose,
 * `deep` = post-increase dose.
 */
export const MED_LANE_RAMP: Record<string, { base: string; deep: string }> = {
  estrogen: { base: '#dfaec7', deep: '#a64d79' },
  progesterone: { base: '#e5aac8', deep: '#c989a7' },
  testosterone: { base: '#c989a7', deep: '#7a3b5e' },
  combination: { base: '#e0a8c6', deep: '#be739a' },
  supportive: { base: '#f0d8e4', deep: '#dfaec7' },
  other: { base: '#f0d8e4', deep: '#dfaec7' },
};

export function getMedLaneRamp(category: string | null | undefined) {
  if (!category) return MED_LANE_RAMP.other;
  return MED_LANE_RAMP[category] ?? MED_LANE_RAMP.other;
}

/** Series ramp — three separable rose depths. The rose family does not support a
 *  fourth distinguishable line colour; selection is capped at 3 to match. */
export const DRILL_DOWN_COLORS = ['#7a3b5e', '#c07396', '#e5aac8'] as const;

/** Series lighter than this need a dot outline to hold on white (design rule 5). */
export const LIGHT_SERIES_INKS: readonly string[] = ['#e5aac8', '#e0a8c6', '#dfaec7'];
export const LIGHT_SERIES_OUTLINE = '#a64d79';

/** Severity as depth of rose (design rule 8) — monotonic lightness, grayscale-safe */
export const HEATMAP_COLORS: Record<number, string> = {
  0: '#faf5f8',
  1: '#eec9dd',
  2: '#c989a7',
  3: '#a64d79',
  4: '#7a3b5e',
};

/** Severity tier accents: depth of rose, never judgment hues (design rules 8–9) */
export const MRS_SEVERITY_HEX: Record<string, string> = {
  none: '#ddb3c4',
  mild: '#c989a7',
  moderate: '#a64d79',
  severe: '#7a3b5e',
};

export function getWellbeingHex(score: number): string {
  if (score >= 7) return '#7a3b5e';
  if (score >= 4) return '#a64d79';
  return '#c989a7';
}

export function formatChartDate(dateStr: string): string {
  const d = civilDateToUTCDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatChartDateLong(dateStr: string): string {
  const d = civilDateToUTCDate(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function filterByDateRange<T extends { checkin_date?: string; draw_date?: string; change_date?: string; start_date?: string }>(
  items: T[],
  range: { start: string; end: string },
  dateKey: keyof T,
): T[] {
  return items.filter((item) => {
    const d = item[dateKey] as string | undefined;
    if (!d) return false;
    return d >= range.start && d <= range.end;
  });
}

export function severityLabel(score: MRSScore | null): string {
  if (score === null) return 'Not rated';
  const labels = ['None', 'Mild', 'Moderate', 'Severe', 'Very Severe'];
  return `${score} (${labels[score]})`;
}

export interface HeatmapSortableRow {
  label: string;
  avgSeverity: number;
  recentSeverity: number;
  cells: Array<{ date: string; score: number | null }>;
}

/** Mean severity across rated cells in the visible window; unrated rows sort last. */
export function meanHeatmapSeverity(
  cells: Array<{ score: number | null | undefined }>,
): number {
  const rated = cells.filter((cell) => cell.score !== null && cell.score !== undefined);
  if (rated.length === 0) return -1;
  return rated.reduce((sum, cell) => sum + Number(cell.score), 0) / rated.length;
}

/** Mean severity across the most recent 4 rated cells; unrated rows sort last. */
export function recentHeatmapSeverity(
  cells: Array<{ score: number | null | undefined }>,
  n = 4,
): number {
  const rated: number[] = [];
  for (let i = cells.length - 1; i >= 0 && rated.length < n; i--) {
    const score = cells[i].score;
    if (score !== null && score !== undefined) rated.push(Number(score));
  }
  if (rated.length === 0) return -1;
  return rated.reduce((sum, v) => sum + v, 0) / rated.length;
}

function mostRecentHeatmapScore(cells: Array<{ score: number | null | undefined }>): number {
  for (let i = cells.length - 1; i >= 0; i--) {
    const score = cells[i].score;
    if (score !== null && score !== undefined) return Number(score);
  }
  return -1;
}

/**
 * Worst symptoms at top. Ranked by MEAN severity across exactly the columns shown —
 * all 3s outranks 2s-and-3s outranks all 2s. `recentSeverity` is now only a tiebreak.
 * Never rank on data that is not on screen.
 */
export function sortHeatmapRows<T extends HeatmapSortableRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.avgSeverity !== a.avgSeverity) return b.avgSeverity - a.avgSeverity;
    if (b.recentSeverity !== a.recentSeverity) return b.recentSeverity - a.recentSeverity;
    const recentDiff = mostRecentHeatmapScore(b.cells) - mostRecentHeatmapScore(a.cells);
    if (recentDiff !== 0) return recentDiff;
    return a.label.localeCompare(b.label);
  });
}
