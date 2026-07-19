/**
 * Shared Recharts line grammar — matches Compare Symptoms & Medications chart.
 * Weekly cadence: straight segments between points + prominent dots on a daily-indexed axis.
 * Never put strokeDasharray on data series (dots inherit it and render as broken arcs).
 */

import type { CSSProperties } from 'react';
import { LIGHT_SERIES_INKS, LIGHT_SERIES_OUTLINE } from './chartHelpers';

/**
 * Recharts applies animated opacity on the tooltip wrapper; without this, chart ink
 * shows through even when the custom content uses solid white.
 */
export const CHART_TOOLTIP_WRAPPER_STYLE: CSSProperties = {
  outline: 'none',
  opacity: 1,
  zIndex: 40,
  pointerEvents: 'none',
};

export const CHART_TOOLTIP_SURFACE_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
};

export interface SeriesLineProps {
  type: 'monotone' | 'linear';
  strokeWidth: number;
  connectNulls: boolean;
  isAnimationActive: boolean;
  dot:
    | false
    | {
        r: number;
        fill: string;
        stroke: string;
        strokeWidth: number;
      };
  activeDot: {
    r: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
  };
  strokeOpacity?: number;
}

/** Weekly measurements (MRS, subscales, symptom trends): linear segments + round dots; connectNulls bridges structural daily nulls. */
export function weeklySeriesProps(stroke: string, dotColor: string = stroke): SeriesLineProps {
  const needsOutline = LIGHT_SERIES_INKS.includes(stroke) || LIGHT_SERIES_INKS.includes(dotColor);
  const dotStroke = needsOutline ? LIGHT_SERIES_OUTLINE : dotColor;
  const dotStrokeWidth = needsOutline ? 0.75 : 0;

  return {
    type: 'linear',
    strokeWidth: 2,
    connectNulls: true,
    isAnimationActive: false,
    dot: { r: 4.5, fill: dotColor, stroke: dotStroke, strokeWidth: dotStrokeWidth },
    activeDot: {
      r: 6,
      fill: dotColor,
      stroke: needsOutline ? LIGHT_SERIES_OUTLINE : '#ffffff',
      strokeWidth: needsOutline ? 0.75 : 1,
    },
  };
}

/** 3-day centered rolling mean for presentation smoothing; edge days use available neighbors only. */
export function rollingAverageCentered3(values: Array<number | null | undefined>): Array<number | null> {
  return values.map((_, i) => {
    const windowIndices =
      i === 0
        ? [0, 1]
        : i === values.length - 1
          ? [i - 1, i]
          : [i - 1, i, i + 1];

    const nums = windowIndices
      .map((j) => values[j])
      .filter((v): v is number => v !== null && v !== undefined);

    if (nums.length === 0) return null;
    return nums.reduce((sum, v) => sum + v, 0) / nums.length;
  });
}

/**
 * Pulse terrain smoothing: null anywhere in the window yields null (honest gaps).
 * Edge days use a 2-day window; interior days use 3-day centered.
 */
export function rollingAverageCentered3Strict(
  values: Array<number | null | undefined>,
): Array<number | null> {
  return values.map((_, i) => {
    const windowIndices =
      i === 0 ? [0, 1] : i === values.length - 1 ? [i - 1, i] : [i - 1, i, i + 1];

    const windowVals = windowIndices.map((j) => values[j]);
    if (windowVals.some((v) => v === null || v === undefined)) return null;

    const nums = windowVals as number[];
    return nums.reduce((sum, v) => sum + v, 0) / nums.length;
  });
}
