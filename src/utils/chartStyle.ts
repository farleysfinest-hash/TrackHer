/**
 * Shared Recharts line grammar — matches Compare Symptoms & Medications chart.
 * Weekly cadence: smooth solid curve + prominent dots. Daily cadence: smooth solid + small/no dots.
 * Never put strokeDasharray on data series (dots inherit it and render as broken arcs).
 */

export interface SeriesLineProps {
  type: 'monotone';
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

import { LIGHT_SERIES_INKS, LIGHT_SERIES_OUTLINE } from './chartHelpers';

/** Weekly measurements (MRS, subscales, symptom trends): solid monotone curve + prominent round dots. */
export function weeklySeriesProps(stroke: string, dotColor: string = stroke): SeriesLineProps {
  const needsOutline = LIGHT_SERIES_INKS.includes(stroke) || LIGHT_SERIES_INKS.includes(dotColor);
  const dotStroke = needsOutline ? LIGHT_SERIES_OUTLINE : dotColor;
  const dotStrokeWidth = needsOutline ? 0.75 : 0;

  return {
    type: 'monotone',
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

/** Daily pulse channels: solid monotone curve, light stroke, minimal markers. */
export function dailySeriesProps(stroke: string): SeriesLineProps {
  return {
    type: 'monotone',
    strokeWidth: 1.5,
    strokeOpacity: 0.75,
    connectNulls: true,
    isAnimationActive: false,
    dot: false,
    activeDot: { r: 3, fill: stroke },
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
