import { beforeEach, describe, expect, it } from 'vitest';
import { useLabEntryStore } from '../labEntryStore';

const importDraft = {
  sourceType: 'photo' as const,
  drawDate: '2026-07-31',
  drawTime: null,
  fasting: null,
  labName: 'Example lab',
  values: [
    {
      reportedLabel: 'Oestradiol',
      biomarkerKey: 'estradiol',
      reportedValue: '367.1',
      normalizedValue: 100,
      comparator: null,
      reportedUnit: 'pmol/L',
      referenceLow: null,
      referenceHigh: null,
      referenceText: '40–161',
      reportedFlag: 'normal' as const,
      sourcePage: null,
      confidence: 0.98,
    },
  ],
  medicationMentions: [],
  warnings: [],
};

describe('labEntryStore imported review', () => {
  beforeEach(() => useLabEntryStore.getState().reset());

  it('clears the old normalized value when the reviewer remaps an extracted row', () => {
    useLabEntryStore.getState().loadImportDraft(importDraft, []);
    useLabEntryStore.getState().setImportedValue(0, { biomarkerKey: 'estrone' });

    expect(useLabEntryStore.getState().values.estradiol).toBeNull();
    expect(useLabEntryStore.getState().values.estrone).toBeCloseTo(99.243, 3);
  });

  it('clears an extracted value when the reviewer removes its source row', () => {
    useLabEntryStore.getState().loadImportDraft(importDraft, []);
    useLabEntryStore.getState().removeImportedValue(0);

    expect(useLabEntryStore.getState().values.estradiol).toBeNull();
    expect(useLabEntryStore.getState().importedValues).toEqual([]);
  });
});
