import type { MRSScore } from '../types/database';
import { civilDateToUTCDate, parseISODate } from './localDate';

/** Chart palette — CSS variables so dark mode can redefine ink without touching call sites. */
export const CHART_COLORS = {
  mrsTotal: 'var(--color-chart-line-primary)',
  mrsTotalDot: 'var(--color-chart-dot)',
  wellbeing: 'var(--color-chart-pulse)',
  /** MRS subscale line ramp: deep rose → raspberry → light blush */
  psychological: 'var(--color-chart-line-primary)',
  somatic: 'var(--color-chart-dot)',
  urogenital: 'var(--color-chart-urogenital)',
  optimalBand: 'var(--color-chart-observation)',
  conventionalBand: 'var(--color-chart-band-conventional)',
  outOfRange: 'var(--color-chart-line-primary)',
  estrogen: 'var(--color-chart-dot)',
  progesterone: 'var(--color-chart-pulse)',
  testosterone: 'var(--color-chart-line-primary)',
  combination: 'var(--color-sage-500)',
  supportive: 'var(--color-chart-band-conventional)',
  other: 'var(--color-chart-band-conventional)',
  changeLine: 'var(--color-sage-400)',
  grid: 'var(--color-chart-grid)',
  axisText: 'var(--color-chart-axis)',
} as const;

/**
 * Medication lane: colour encodes CATEGORY (identity), depth encodes dose state.
 * A dose increase deepens the bar WITHIN its own category tone — a progesterone
 * bar never turns into estrogen's ink. `base` = continuous / pre-change dose,
 * `deep` = post-increase dose.
 */
export const MED_LANE_RAMP: Record<string, { base: string; deep: string }> = {
  estrogen: { base: 'var(--color-chart-band-conventional)', deep: 'var(--color-chart-dot)' },
  progesterone: { base: 'var(--color-chart-observation)', deep: 'var(--color-chart-pulse)' },
  testosterone: { base: 'var(--color-chart-pulse)', deep: 'var(--color-chart-line-primary)' },
  combination: { base: 'var(--color-chart-urogenital)', deep: 'var(--color-sage-500)' },
  supportive: { base: 'var(--color-chart-med-muted)', deep: 'var(--color-chart-band-conventional)' },
  other: { base: 'var(--color-chart-med-muted)', deep: 'var(--color-chart-band-conventional)' },
};

export function getMedLaneRamp(category: string | null | undefined) {
  if (!category) return MED_LANE_RAMP.other;
  return MED_LANE_RAMP[category] ?? MED_LANE_RAMP.other;
}

/** Series ramp — three separable rose depths. The rose family does not support a
 *  fourth distinguishable line colour; selection is capped at 3 to match. */
export const DRILL_DOWN_COLORS = [
  'var(--color-chart-line-primary)',
  'var(--color-chart-line-secondary)',
  'var(--color-chart-observation)',
] as const;

/** Series lighter than this need a dot outline to hold on white (design rule 5). */
export const LIGHT_SERIES_INKS: readonly string[] = [
  'var(--color-chart-observation)',
  'var(--color-chart-urogenital)',
  'var(--color-chart-band-conventional)',
];
export const LIGHT_SERIES_OUTLINE = 'var(--color-chart-dot)';

/** Severity as depth of rose (design rule 8) — monotonic lightness, grayscale-safe */
export const HEATMAP_COLORS: Record<number, string> = {
  0: 'var(--color-heat-0)',
  1: 'var(--color-heat-1)',
  2: 'var(--color-heat-2)',
  3: 'var(--color-heat-3)',
  4: 'var(--color-heat-4)',
};

/** Severity tier accents: depth of rose, never judgment hues (design rules 8–9) */
export const MRS_SEVERITY_HEX: Record<string, string> = {
  none: 'var(--color-sage-300)',
  mild: 'var(--color-severity-2)',
  moderate: 'var(--color-severity-4)',
  severe: 'var(--color-severity-5)',
};

export function getWellbeingHex(score: number): string {
  if (score >= 7) return 'var(--color-severity-5)';
  if (score >= 4) return 'var(--color-severity-4)';
  return 'var(--color-severity-2)';
}

export function formatChartDate(dateStr: string): string {
  const d = civilDateToUTCDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Compact civil date for narrow columns (iPhone mini heatmap): `6/10`. */
export function formatChartDateCompact(dateStr: string): string {
  const { month, day } = parseISODate(dateStr);
  return `${month}/${day}`;
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
