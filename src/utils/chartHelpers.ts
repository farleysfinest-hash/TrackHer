import type { MRSScore } from '../types/database';

/** Chart palette — aligned with soft blush theme (#BE739A) */
export const CHART_COLORS = {
  mrsTotal: '#4a2338',
  wellbeing: '#c989a7',
  /** MRS subscale line ramp: light blush → mid → brand rose (all clearly distinct) */
  somatic: '#d4a0b5',
  psychological: '#be739a',
  urogenital: '#c989a7',
  optimalBand: '#5a8a4a',
  conventionalBand: '#c4946c',
  outOfRange: '#b54f4f',
  estrogen: '#d4a0b5',
  progesterone: '#be739a',
  testosterone: '#8a6a7a',
  other: '#c4b4b8',
  changeLine: '#ce93ad',
  grid: '#f0eaec',
  axisText: '#b896a3',
} as const;

export const DRILL_DOWN_COLORS = ['#be739a', '#a88088', '#8a6a7a', '#c4946c'] as const;

export const HEATMAP_COLORS: Record<number, string> = {
  0: '#faf5f8',
  1: '#f5d0e0',
  2: '#fbbf24',
  3: '#f97316',
  4: '#ef4444',
};

export const MRS_SEVERITY_HEX: Record<string, string> = {
  none: '#5a8a4a',
  mild: '#d97706',
  moderate: '#ea580c',
  severe: '#dc2626',
};

export function getWellbeingHex(score: number): string {
  if (score >= 7) return CHART_COLORS.mrsTotal;
  if (score >= 4) return '#d97706';
  return '#dc2626';
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
