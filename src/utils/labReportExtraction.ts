import { LAB_BIOMARKERS } from '../data/labRanges';
import type { LabReportedFlag, LabReportedValue, LabSourceType } from '../types/labs';

export interface LabReportExtractionDraft {
  sourceType: Exclude<LabSourceType, 'manual'>;
  drawDate: string | null;
  drawTime: string | null;
  fasting: boolean | null;
  labName: string;
  values: LabReportedValue[];
  medicationMentions: string[];
  warnings: string[];
  /** Client-only review aid. Never included in the saved lab payload. */
  previewDataUrl?: string;
}

const BIOMARKER_KEYS = new Set(LAB_BIOMARKERS.map((item) => item.key));
const FLAGS = new Set<LabReportedFlag>(['low', 'high', 'normal', 'abnormal', 'unknown']);

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function nullableText(value: unknown, maxLength: number): string | null {
  const result = text(value, maxLength);
  return result || null;
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function confidence(value: unknown): number {
  const number = finite(value);
  return number === null ? 0 : Math.min(1, Math.max(0, number));
}

function normalizedUnit(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll('μ', 'u')
    .replaceAll('µ', 'u')
    .replaceAll('mcg', 'ug')
    .replaceAll(' ', '');
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Only conversions with a fixed unit relationship are allowed automatically. */
export function normalizeExtractedLabValue(
  biomarkerKey: string | null,
  reportedValue: string,
  reportedUnit: string | null,
): number | null {
  if (!biomarkerKey || !BIOMARKER_KEYS.has(biomarkerKey)) return null;
  const value = Number(reportedValue.replaceAll(',', ''));
  if (!Number.isFinite(value) || !reportedUnit) return null;
  const biomarker = LAB_BIOMARKERS.find((item) => item.key === biomarkerKey);
  if (!biomarker) return null;
  const from = normalizedUnit(reportedUnit);
  const to = normalizedUnit(biomarker.unit);
  if (from === to) return value;
  if (biomarkerKey === 'estradiol' && from === 'pmol/l' && to === 'pg/ml') return round(value / 3.671);
  if (biomarkerKey === 'estrone' && from === 'pmol/l' && to === 'pg/ml') return round(value / 3.699);
  if (biomarkerKey === 'progesterone' && from === 'nmol/l' && to === 'ng/ml') return round(value / 3.18);
  if (biomarkerKey === 'total_testosterone' && from === 'nmol/l' && to === 'ng/dl') return round(value * 28.84);
  if (biomarkerKey === 'free_testosterone' && from === 'pmol/l' && to === 'pg/ml') return round(value / 3.467);
  if (biomarkerKey === 'dhea_s' && from === 'umol/l' && to === 'ug/dl') return round(value * 36.85);
  if (biomarkerKey === 'cortisol_am' && from === 'nmol/l' && to === 'ug/dl') return round(value / 27.59);
  if (biomarkerKey === 'vitamin_d' && from === 'nmol/l' && to === 'ng/ml') return round(value / 2.496);
  if (biomarkerKey === 'ferritin' && from === 'ug/l' && to === 'ng/ml') return value;
  if (
    (biomarkerKey === 'total_cholesterol' || biomarkerKey === 'ldl' || biomarkerKey === 'hdl') &&
    from === 'mmol/l' &&
    to === 'mg/dl'
  ) return round(value * 38.67);
  if (biomarkerKey === 'triglycerides' && from === 'mmol/l' && to === 'mg/dl') return round(value * 88.57);
  if (biomarkerKey === 'hba1c' && from === 'mmol/mol' && to === '%') return round(value * 0.09148 + 2.152);
  return null;
}

function clampReportedValue(value: unknown): LabReportedValue | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const reportedLabel = text(row.reportedLabel, 120);
  const reportedValue = text(row.reportedValue, 40);
  if (!reportedLabel || !reportedValue) return null;
  const proposedKey = text(row.biomarkerKey, 80);
  const biomarkerKey = BIOMARKER_KEYS.has(proposedKey) ? proposedKey : null;
  const reportedUnit = nullableText(row.reportedUnit, 40);
  const proposedComparator = row.comparator;
  const comparator =
    proposedComparator === '<' ||
    proposedComparator === '<=' ||
    proposedComparator === '>' ||
    proposedComparator === '>='
      ? proposedComparator
      : null;
  const proposedFlag = text(row.reportedFlag, 20).toLowerCase() as LabReportedFlag;
  return {
    reportedLabel,
    biomarkerKey,
    reportedValue,
    normalizedValue: normalizeExtractedLabValue(biomarkerKey, reportedValue, reportedUnit),
    comparator,
    reportedUnit,
    referenceLow: finite(row.referenceLow),
    referenceHigh: finite(row.referenceHigh),
    referenceText: nullableText(row.referenceText, 160),
    reportedFlag: FLAGS.has(proposedFlag) ? proposedFlag : 'unknown',
    sourcePage: finite(row.sourcePage),
    confidence: confidence(row.confidence),
  };
}

export function clampLabReportExtraction(value: unknown): LabReportExtractionDraft | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const sourceType = row.sourceType === 'pdf' ? 'pdf' : 'photo';
  const values = Array.isArray(row.values)
    ? row.values.map(clampReportedValue).filter((item): item is LabReportedValue => item !== null).slice(0, 100)
    : [];
  if (values.length === 0) return null;
  return {
    sourceType,
    drawDate: nullableText(row.drawDate, 10),
    drawTime: nullableText(row.drawTime, 8),
    fasting: typeof row.fasting === 'boolean' ? row.fasting : null,
    labName: text(row.labName, 160),
    values,
    medicationMentions: Array.isArray(row.medicationMentions)
      ? [...new Set(row.medicationMentions.map((item) => text(item, 120)).filter(Boolean))].slice(0, 20)
      : [],
    warnings: Array.isArray(row.warnings)
      ? row.warnings.map((item) => text(item, 240)).filter(Boolean).slice(0, 20)
      : [],
  };
}

export function reportedValuesRecord(values: LabReportedValue[]): Record<string, LabReportedValue> {
  const result: Record<string, LabReportedValue> = {};
  values.forEach((value) => {
    const base = value.biomarkerKey ?? `unmapped-${value.reportedLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'result'}`;
    let key = base;
    let suffix = 2;
    while (key in result) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }
    result[key] = { ...value };
  });
  return result;
}
