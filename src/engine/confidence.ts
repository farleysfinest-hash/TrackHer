import type { InsightConfidence, InsightSampleSize, ConfidenceLevel } from './types';
import { formatSampleSizeSuffix } from './types';
import { pooledStdDev } from './engineStats';

export interface ConfidenceInputs {
  /** Engine minimum sample count (per arm or total). */
  sampleFloor: number;
  /** Limiting sample count (e.g. min of before/after arms, or total n). */
  sampleCount: number;
  delta: number;
  pooledStdDev: number;
  /** Analysis window length in days. */
  windowDays: number;
  /** Check-ins / readings present in the window. */
  actualInWindow: number;
  basis?: string;
  sampleSize?: InsightSampleSize;
}

function normalizeSampleScore(count: number, floor: number): number {
  if (count <= floor) return 0;
  if (count >= floor * 2) return 1;
  return (count - floor) / floor;
}

function effectSizeScore(delta: number, noise: number): number {
  if (noise <= 0) {
    return Math.abs(delta) > 0 ? 0.5 : 0;
  }
  const ratio = Math.abs(delta) / noise;
  if (ratio < 1.0) {
    return Math.max(0, (ratio / 1.0) * 0.25);
  }
  return Math.min(1, ratio / 2.0);
}

function densityScore(windowDays: number, actualInWindow: number): number {
  const expected = Math.max(1, Math.round(windowDays / 7));
  return Math.min(1, actualInWindow / expected);
}

function scoreToLevel(score: number): ConfidenceLevel {
  if (score < 0.4) return 'low';
  if (score <= 0.7) return 'moderate';
  return 'high';
}

export function formatConfidenceBasis(sampleSize: InsightSampleSize): string {
  const suffix = formatSampleSizeSuffix(sampleSize);
  return suffix.charAt(0).toLowerCase() + suffix.slice(1);
}

export function computeInsightConfidence(inputs: ConfidenceInputs): InsightConfidence {
  const sampleScore = normalizeSampleScore(inputs.sampleCount, inputs.sampleFloor);
  const effectScore = effectSizeScore(inputs.delta, inputs.pooledStdDev);
  const density = densityScore(inputs.windowDays, inputs.actualInWindow);
  const score = 0.4 * sampleScore + 0.4 * effectScore + 0.2 * density;
  const basis =
    inputs.basis ??
    (inputs.sampleSize ? formatConfidenceBasis(inputs.sampleSize) : `${inputs.sampleCount} data points`);

  return {
    level: scoreToLevel(score),
    score,
    basis,
  };
}

export function formatConfidenceLine(confidence: InsightConfidence): string {
  const levelLabel =
    confidence.level === 'high'
      ? 'High'
      : confidence.level === 'moderate'
        ? 'Moderate'
        : 'Low';
  return `${levelLabel} confidence — ${confidence.basis}`;
}

/** Convenience when before/after numeric series are available. */
export function confidenceFromBeforeAfter(
  beforeValues: number[],
  afterValues: number[],
  delta: number,
  windowDays: number,
  sampleFloor: number,
  sampleSize: InsightSampleSize,
): InsightConfidence {
  return computeInsightConfidence({
    sampleFloor,
    sampleCount: Math.min(beforeValues.length, afterValues.length),
    delta,
    pooledStdDev: pooledStdDev(beforeValues, afterValues),
    windowDays,
    actualInWindow: beforeValues.length + afterValues.length,
    sampleSize,
  });
}
