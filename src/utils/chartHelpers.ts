import type { MRSScore } from '../types/database';

/** Chart palette — aligned with soft blush theme (#BE739A) */
export const CHART_COLORS = {
  mrsTotal: '#be739a',
  wellbeing: '#a88088',
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
