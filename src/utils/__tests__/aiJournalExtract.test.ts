import { describe, expect, it } from 'vitest';
import { clampJournalExtract } from '../aiJournalExtract';

describe('clampJournalExtract', () => {
  const catalog = new Map([
    ['hot_flashes', 'Hot flashes'],
    ['anxiety', 'Anxiety'],
  ]);
  const meds = new Set(['Estradiol', 'Progesterone']);

  it('filters unknown symptom keys and caps at 6', () => {
    const result = clampJournalExtract(
      {
        symptoms: [
          { key: 'hot_flashes', reason: 'mentioned heat' },
          { key: 'not_real', reason: 'x' },
          { key: 'anxiety', label: 'Anxiety', reason: 'worried' },
        ],
        events: [],
      },
      catalog,
      meds,
    );
    expect(result.symptoms).toHaveLength(2);
    expect(result.symptoms[0]).toEqual({
      key: 'hot_flashes',
      label: 'Hot flashes',
      reason: 'mentioned heat',
    });
  });

  it('nulls medicationName when not in allowed set', () => {
    const result = clampJournalExtract(
      {
        symptoms: [],
        events: [
          { type: 'missed_dose', medicationName: 'MysteryMed', note: 'forgot morning' },
          { type: 'note', medicationName: 'Estradiol', note: 'felt flat after patch' },
          { type: 'hack', medicationName: 'Estradiol', note: 'nope' },
        ],
      },
      catalog,
      meds,
    );
    expect(result.events).toEqual([
      { type: 'missed_dose', medicationName: null, note: 'forgot morning' },
      { type: 'note', medicationName: 'Estradiol', note: 'felt flat after patch' },
    ]);
  });

  it('passes through crisis risk replies and clears chips', () => {
    const result = clampJournalExtract(
      {
        symptoms: [{ key: 'anxiety', reason: 'should drop' }],
        events: [],
        risk: 'crisis',
        riskReply: 'Please call or text 988…',
      },
      catalog,
      meds,
    );
    expect(result.symptoms).toEqual([]);
    expect(result.risk).toBe('crisis');
    expect(result.riskReply).toMatch(/988/);
  });
});
