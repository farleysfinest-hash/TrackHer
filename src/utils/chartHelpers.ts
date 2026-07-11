import type { MRSScore } from '../types/database';

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
  estrogen: '#d4a0b5',
  progesterone: '#be739a',
  testosterone: '#8a6a7a',
  other: '#c4b4b8',
  changeLine: '#ce93ad',
  grid: '#f0eaec',
  axisText: '#b896a3',
} as const;

export const DRILL_DOWN_COLORS = ['#be739a', '#a88088', '#8a6a7a', '#7a3b5e'] as const;

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
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatChartDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

function mostRecentHeatmapScore(cells: Array<{ score: number | null | undefined }>): number {
  for (let i = cells.length - 1; i >= 0; i--) {
    const score = cells[i].score;
    if (score !== null && score !== undefined) return Number(score);
  }
  return -1;
}

/** Worst symptoms first: mean severity desc, then most recent value, then label. */
export function sortHeatmapRows<T extends HeatmapSortableRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.avgSeverity !== a.avgSeverity) return b.avgSeverity - a.avgSeverity;
    const recentDiff = mostRecentHeatmapScore(b.cells) - mostRecentHeatmapScore(a.cells);
    if (recentDiff !== 0) return recentDiff;
    return a.label.localeCompare(b.label);
  });
}
