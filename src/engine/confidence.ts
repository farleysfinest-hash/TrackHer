import type { InsightConfidence, InsightSampleSize, ConfidenceLevel } from './types';
import { formatSampleSizeSuffix } from './types';
import { pooledStdDev } from './engineStats';
import { todayISO } from '../utils/localDate';

export type EngineCategory = 'comparative' | 'observational' | 'provisional';

export interface ComparativeConfidenceInputs {
  sampleFloor: number;
  sampleCount: number;
  delta: number;
  pooledStdDev: number;
  windowDays: number;
  actualInWindow: number;
  basis?: string;
  sampleSize?: InsightSampleSize;
}

export interface ObservationalConfidenceInputs {
  sampleFloor: number;
  sampleCount: number;
  windowDays: number;
  actualInWindow: number;
  /** ISO date of the most recent supporting data point. */
  mostRecentDataDate: string;
  basis?: string;
  sampleSize?: InsightSampleSize;
}

function normalizeComparativeSampleScore(count: number, floor: number): number {
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

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function recencyScore(mostRecentDataDate: string, today: string = todayISO()): number {
  const days = daysBetween(mostRecentDataDate, today);
  if (days <= 14) return 1;
  if (days >= 60) return 0;
  return 1 - (days - 14) / (60 - 14);
}

export function formatConfidenceBasis(sampleSize: InsightSampleSize): string {
  const suffix = formatSampleSizeSuffix(sampleSize);
  return suffix.charAt(0).toLowerCase() + suffix.slice(1);
}

export function computeComparativeConfidence(
  inputs: ComparativeConfidenceInputs,
): InsightConfidence {
  const sampleScore = normalizeComparativeSampleScore(inputs.sampleCount, inputs.sampleFloor);
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

export function computeObservationalConfidence(
  inputs: ObservationalConfidenceInputs,
): InsightConfidence {
  const density = densityScore(inputs.windowDays, inputs.actualInWindow);
  const sufficiency = Math.min(1, inputs.sampleCount / inputs.sampleFloor);
  const recency = recencyScore(inputs.mostRecentDataDate);
  const score = 0.5 * density + 0.3 * sufficiency + 0.2 * recency;
  const basis =
    inputs.basis ??
    (inputs.sampleSize ? formatConfidenceBasis(inputs.sampleSize) : `${inputs.sampleCount} data points`);

  return {
    level: scoreToLevel(score),
    score,
    basis,
  };
}

export function provisionalInsightConfidence(): InsightConfidence {
  return {
    level: 'provisional',
    score: null,
    basis: 'your first few check-ins',
  };
}

/** @deprecated Use computeComparativeConfidence */
export function computeInsightConfidence(inputs: ComparativeConfidenceInputs): InsightConfidence {
  return computeComparativeConfidence(inputs);
}

export function formatConfidenceLine(confidence: InsightConfidence): string {
  if (confidence.level === 'provisional') {
    return 'Early days — based on your first few check-ins.';
  }
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
  return computeComparativeConfidence({
    sampleFloor,
    sampleCount: Math.min(beforeValues.length, afterValues.length),
    delta,
    pooledStdDev: pooledStdDev(beforeValues, afterValues),
    windowDays,
    actualInWindow: beforeValues.length + afterValues.length,
    sampleSize,
  });
}

export function confidenceSortScore(confidence: InsightConfidence): number {
  if (confidence.level === 'provisional') return 0;
  return confidence.score ?? 0;
}
