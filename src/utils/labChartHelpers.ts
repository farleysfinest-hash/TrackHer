import type { LabBiomarker } from '../types/labs';
import { formatRange } from './labHelpers';

const DOMAIN_PADDING_RATIO = 0.35;
const MIN_SPAN_RATIO = 0.5;
const EDGE_BAND_FRACTION = 0.20;

export interface LabYDomain {
  min: number;
  max: number;
}

export interface ClippedReferenceBand {
  y1: number;
  y2: number;
  label: string;
  fill: string;
  fillOpacity: number;
}

export interface ReferenceEdgeHint {
  edge: 'top' | 'bottom';
  label: string;
  fill: string;
}

/** Fit y-axis to the user's values with padding; never force the full reference range. */
export function computeLabYDomain(values: number[]): LabYDomain {
  if (values.length === 0) return { min: 0, max: 100 };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const minSpan = Math.max(
    span > 0 ? span * MIN_SPAN_RATIO : 0,
    Math.abs(max) * 0.08,
    1,
  );
  const effectiveSpan = Math.max(span, minSpan);
  const padding = effectiveSpan * DOMAIN_PADDING_RATIO;

  return {
    min: min - padding,
    max: max + padding,
  };
}

function clipRangeToDomain(
  rangeMin: number,
  rangeMax: number,
  domain: LabYDomain,
): { y1: number; y2: number } | null {
  const y1 = Math.max(rangeMin, domain.min);
  const y2 = Math.min(rangeMax, domain.max);
  if (y2 <= y1) return null;
  return { y1, y2 };
}

export function getConventionalBandLabel(biomarker: LabBiomarker): string {
  if (!biomarker.conventionalRange) return '';
  return `Typical range ${formatRange(biomarker.conventionalRange)} ${biomarker.unit}`;
}

export function getOptimalBandLabel(biomarker: LabBiomarker): string {
  if (!biomarker.optimalRange) return '';
  return `Optimal range ${formatRange(biomarker.optimalRange)} ${biomarker.unit}`;
}

/** Compact one-line legend for chart chrome (avoids overlapping in-plot ReferenceArea labels). */
export function getReferenceLegendLine(biomarker: LabBiomarker): string | null {
  const parts: string[] = [];
  if (biomarker.conventionalRange) {
    parts.push(`Typical ${formatRange(biomarker.conventionalRange)}`);
  }
  if (biomarker.optimalRange) {
    parts.push(`Optimal ${formatRange(biomarker.optimalRange)}`);
  }
  if (parts.length === 0) return null;
  return `${parts.join(' · ')} ${biomarker.unit}`;
}

export function resolveReferenceBands(
  biomarker: LabBiomarker,
  domain: LabYDomain,
  colors: { conventional: string; optimal: string },
): { bands: ClippedReferenceBand[]; edges: ReferenceEdgeHint[] } {
  const bands: ClippedReferenceBand[] = [];
  const edges: ReferenceEdgeHint[] = [];
  const domainSpan = domain.max - domain.min || 1;
  const minBandHeight = domainSpan * 0.04;

  const ranges: Array<{
    range: { min: number; max: number } | null;
    label: string;
    fill: string;
    fillOpacity: number;
  }> = [
    {
      range: biomarker.conventionalRange,
      label: getConventionalBandLabel(biomarker),
      fill: colors.conventional,
      fillOpacity: 0.14,
    },
    {
      range: biomarker.optimalRange,
      label: getOptimalBandLabel(biomarker),
      fill: colors.optimal,
      fillOpacity: 0.18,
    },
  ];

  for (const entry of ranges) {
    if (!entry.range || !entry.label) continue;
    const clipped = clipRangeToDomain(entry.range.min, entry.range.max, domain);
    if (clipped && clipped.y2 - clipped.y1 >= minBandHeight) {
      bands.push({
        y1: clipped.y1,
        y2: clipped.y2,
        label: entry.label,
        fill: entry.fill,
        fillOpacity: entry.fillOpacity,
      });
      continue;
    }

    if (entry.range.max < domain.min) {
      edges.push({
        edge: 'bottom',
        label: `↓ ${entry.label}`,
        fill: entry.fill,
      });
    } else if (entry.range.min > domain.max) {
      edges.push({
        edge: 'top',
        label: `↑ ${entry.label}`,
        fill: entry.fill,
      });
    }
  }

  return { bands, edges };
}

export function referenceEdgeArea(
  edge: ReferenceEdgeHint['edge'],
  domain: LabYDomain,
): { y1: number; y2: number } {
  const span = domain.max - domain.min;
  const height = span * EDGE_BAND_FRACTION;
  if (edge === 'top') {
    return { y1: domain.max - height, y2: domain.max };
  }
  return { y1: domain.min, y2: domain.min + height };
}

export function formatLabChartValue(value: number): string {
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.05) {
    return String(Math.round(value));
  }
  return Number(value.toFixed(1)).toString();
}
