import type { MouseHandlerDataParam } from 'recharts';

/**
 * Resolve the active category date from a Recharts v3 chart click.
 * `dates` should be ISO dates in chart order. Optional `labels` maps the same
 * indices when the visible axis uses dateLabel instead of date.
 */
export function dateFromChartClick(
  state: MouseHandlerDataParam | undefined,
  dates: string[],
  labels?: string[],
): string | null {
  if (!state) return null;

  const label = state.activeLabel;
  if (typeof label === 'string' && label.length > 0) {
    if (dates.includes(label)) return label;
    if (labels) {
      const idx = labels.indexOf(label);
      if (idx >= 0) return dates[idx] ?? null;
    }
  }

  const index =
    typeof state.activeTooltipIndex === 'number'
      ? state.activeTooltipIndex
      : typeof state.activeIndex === 'number'
        ? state.activeIndex
        : null;

  if (index != null && index >= 0 && index < dates.length) {
    return dates[index] ?? null;
  }

  return null;
}
