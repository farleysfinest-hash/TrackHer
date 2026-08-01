import { describe, expect, it } from 'vitest';
import {
  clampLabReportExtraction,
  normalizeExtractedLabValue,
  reportedValuesRecord,
} from '../labReportExtraction';

describe('lab report extraction review data', () => {
  it('normalizes only fixed, supported unit conversions', () => {
    expect(normalizeExtractedLabValue('estradiol', '367.1', 'pmol/L')).toBe(100);
    expect(normalizeExtractedLabValue('vitamin_d', '124.8', 'nmol/L')).toBe(50);
    expect(normalizeExtractedLabValue('ferritin', '24', 'ug/L')).toBe(24);
    expect(normalizeExtractedLabValue('estradiol', '100', 'mystery unit')).toBeNull();
    expect(normalizeExtractedLabValue(null, '100', 'pmol/L')).toBeNull();
  });

  it('preserves laboratory intervals, flags, comparators, and unsupported analytes', () => {
    const result = clampLabReportExtraction({
      sourceType: 'photo',
      drawDate: '2026-07-31',
      labName: 'Example NHS Lab',
      values: [
        {
          reportedLabel: 'Oestradiol',
          biomarkerKey: 'estradiol',
          reportedValue: '367.1',
          reportedUnit: 'pmol/L',
          referenceLow: 40,
          referenceHigh: 161,
          referenceText: '40–161',
          reportedFlag: 'high',
          confidence: 0.98,
          sourcePage: 1,
        },
        {
          reportedLabel: 'Reverse T3',
          biomarkerKey: 'not_a_supported_key',
          reportedValue: '18',
          reportedUnit: 'ng/dL',
          comparator: '<',
          referenceText: '8–25',
          reportedFlag: 'normal',
          confidence: 0.92,
        },
      ],
      medicationMentions: ['Levothyroxine', 'Levothyroxine'],
    });

    expect(result?.values[0]).toMatchObject({
      biomarkerKey: 'estradiol',
      normalizedValue: 100,
      referenceText: '40–161',
      reportedFlag: 'high',
    });
    expect(result?.values[1]).toMatchObject({
      biomarkerKey: null,
      comparator: '<',
      reportedValue: '18',
    });
    expect(result?.medicationMentions).toEqual(['Levothyroxine']);
  });

  it('creates stable distinct keys without dropping duplicate or uncharted rows', () => {
    const draft = clampLabReportExtraction({
      values: [
        { reportedLabel: 'Ferritin', biomarkerKey: 'ferritin', reportedValue: '20', reportedUnit: 'ng/mL', confidence: 1 },
        { reportedLabel: 'Ferritin repeat', biomarkerKey: 'ferritin', reportedValue: '21', reportedUnit: 'ng/mL', confidence: 1 },
        { reportedLabel: 'Custom marker', biomarkerKey: null, reportedValue: '4', reportedUnit: 'U/L', confidence: 1 },
      ],
    });

    const stored = reportedValuesRecord(draft?.values ?? []);
    expect(Object.keys(stored)).toEqual(['ferritin', 'ferritin-2', 'unmapped-custom-marker']);
    expect(stored.ferritin.sourcePage).toBeNull();
  });
});
