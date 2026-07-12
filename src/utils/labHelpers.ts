import type { LabResult } from '../types/database';
import type { LabBiomarker } from '../types/labs';
import { LAB_BIOMARKERS } from '../data/labRanges';

export type LabValueStatus = 'optimal' | 'conventional' | 'out_of_range' | 'unknown';

export const LAB_CATEGORIES: Array<{ key: LabBiomarker['category']; label: string }> = [
  { key: 'core_hrt', label: 'Core Hormone Panel' },
  { key: 'thyroid', label: 'Thyroid Panel' },
  { key: 'metabolic', label: 'Metabolic & Wellness' },
  { key: 'lipid', label: 'Lipid Panel' },
];

export const PRIORITY_BIOMARKER_KEYS = [
  'estradiol',
  'progesterone',
  'total_testosterone',
  'fsh',
  'tsh',
  'shbg',
] as const;

export const BIOMARKER_KEYS = LAB_BIOMARKERS.map((b) => b.key);

export function getValueStatus(value: number, biomarker: LabBiomarker): LabValueStatus {
  const { conventionalRange, optimalRange } = biomarker;

  if (optimalRange && value >= optimalRange.min && value <= optimalRange.max) {
    return 'optimal';
  }

  if (conventionalRange) {
    if (value >= conventionalRange.min && value <= conventionalRange.max) {
      return 'conventional';
    }
    if (value < conventionalRange.min || value > conventionalRange.max) {
      return 'out_of_range';
    }
  }

  return 'unknown';
}

export function getStatusBorderClass(status: LabValueStatus | null): string {
  switch (status) {
    case 'optimal':
      return 'border-sage-400';
    case 'conventional':
      return 'border-sage-600';
    case 'out_of_range':
      return 'border-sage-800';
    default:
      return 'border-sand-200';
  }
}

/**
 * Lab dots do not judge (design rule 9). A high FSH is not an emergency — it is
 * what menopause is. Depth of rose marks distance from her target range; the
 * WORDS beside the value carry the interpretation.
 */
export function getStatusDotClass(status: LabValueStatus | null): string {
  switch (status) {
    case 'optimal':
      return 'bg-sage-200';
    case 'conventional':
      return 'bg-sage-500';
    case 'out_of_range':
      return 'bg-sage-800';
    default:
      return 'bg-sand-300';
  }
}

export function formatRange(range: { min: number; max: number } | null): string {
  if (!range) return '—';
  return `${range.min}–${range.max}`;
}

export function formatRangeLine(biomarker: LabBiomarker): string {
  const conv = biomarker.conventionalRange
    ? `Conventional: ${formatRange(biomarker.conventionalRange)}`
    : 'Conventional: —';
  const opt = biomarker.optimalRange
    ? `Optimal: ${formatRange(biomarker.optimalRange)}`
    : 'Optimal: —';
  return `${conv} · ${opt}`;
}

export function getBiomarkerValue(lab: LabResult, key: string): number | null {
  const val = (lab as unknown as Record<string, number | null | string>)[key];
  return typeof val === 'number' ? val : null;
}

export function labToValues(lab: LabResult): Record<string, number | null> {
  const values: Record<string, number | null> = {};
  for (const key of BIOMARKER_KEYS) {
    values[key] = getBiomarkerValue(lab, key);
  }
  return values;
}

export function countFilledValues(values: Record<string, number | null>): number {
  return BIOMARKER_KEYS.filter((k) => values[k] !== null && values[k] !== undefined).length;
}

export function countFilledLab(lab: LabResult): number {
  return countFilledValues(labToValues(lab));
}

export function getFilledBiomarkers(lab: LabResult): Array<{ key: string; value: number }> {
  return BIOMARKER_KEYS.filter((k) => getBiomarkerValue(lab, k) !== null).map((k) => ({
    key: k,
    value: getBiomarkerValue(lab, k)!,
  }));
}

export function getDisplayBiomarkers(lab: LabResult, max = 6): Array<{ key: string; value: number }> {
  const filled = getFilledBiomarkers(lab);
  const priority = PRIORITY_BIOMARKER_KEYS.map((k) => filled.find((f) => f.key === k)).filter(
    Boolean,
  ) as Array<{ key: string; value: number }>;
  const rest = filled.filter((f) => !PRIORITY_BIOMARKER_KEYS.includes(f.key as typeof PRIORITY_BIOMARKER_KEYS[number]));
  return [...priority, ...rest].slice(0, max);
}

export type TrendDirection = 'up' | 'down' | 'flat' | null;

export function getTrendDirection(
  current: number | null,
  previous: number | null,
): TrendDirection {
  if (current === null || previous === null || previous === 0) {
    if (current === null || previous === null) return null;
    if (current === previous) return 'flat';
    return current > previous ? 'up' : 'down';
  }
  const pctChange = Math.abs((current - previous) / previous);
  if (pctChange <= 0.05) return 'flat';
  return current > previous ? 'up' : 'down';
}

export function getRangeBarPosition(
  value: number,
  biomarker: LabBiomarker,
): number {
  const { conventionalRange, optimalRange } = biomarker;
  const min = conventionalRange?.min ?? optimalRange?.min ?? 0;
  const max = conventionalRange?.max ?? optimalRange?.max ?? (value * 2 || 100);
  const span = max - min || 1;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / span) * 100;
}

export function getOptimalSegment(
  biomarker: LabBiomarker,
): { left: number; width: number } | null {
  const { conventionalRange, optimalRange } = biomarker;
  if (!optimalRange) return null;
  const min = conventionalRange?.min ?? optimalRange.min * 0.5;
  const max = conventionalRange?.max ?? optimalRange.max * 1.5;
  const span = max - min || 1;
  const left = ((optimalRange.min - min) / span) * 100;
  const width = ((optimalRange.max - optimalRange.min) / span) * 100;
  return { left: Math.max(0, left), width: Math.min(100 - left, width) };
}

import { daysBetweenISO, todayISO } from './localDate';

export function getWeeksSinceDraw(drawDate: string, today: string = todayISO()): number {
  const days = daysBetweenISO(drawDate, today);
  return Math.floor(days / 7);
}

export function getNextLabsMessage(drawDate: string | null): string {
  if (!drawDate) return 'Add your first lab results to start tracking.';
  const weeks = getWeeksSinceDraw(drawDate);
  if (weeks > 12) return 'It may be time for new labs.';
  const remaining = 12 - weeks;
  return `Next labs recommended in ~${remaining} week${remaining !== 1 ? 's' : ''}`;
}
