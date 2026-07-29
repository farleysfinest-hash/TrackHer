import { describe, expect, it } from 'vitest';
import { clampVisitPrepPack, formatVisitPrepForCopy } from '../aiVisitPrep';

describe('clampVisitPrepPack', () => {
  it('returns null for missing summary', () => {
    expect(clampVisitPrepPack({})).toBeNull();
    expect(clampVisitPrepPack({ summary: '   ' })).toBeNull();
  });

  it('clamps arrays and nulls empty watchSince', () => {
    const pack = clampVisitPrepPack({
      summary: 'Recent sleep scores have been climbing.',
      symptomsToRaise: ['Hot flashes on Jul 12 (MRS 3)', 42, '', 'Night sweats Jul 18'],
      questions: ['What range are we aiming for with my estrogen?', 'a', 'b', 'c', 'd', 'e'],
      watchSince: '   ',
    });
    expect(pack).toEqual({
      summary: 'Recent sleep scores have been climbing.',
      symptomsToRaise: ['Hot flashes on Jul 12 (MRS 3)', 'Night sweats Jul 18'],
      questions: [
        'What range are we aiming for with my estrogen?',
        'a',
        'b',
        'c',
      ],
      watchSince: null,
    });
  });

  it('formats a copyable pack', () => {
    const text = formatVisitPrepForCopy({
      summary: 'Summary line.',
      symptomsToRaise: ['Symptom A'],
      questions: ['Question 1?'],
      watchSince: 'Dose change Jul 1 — follow up on sleep.',
    });
    expect(text).toContain('Summary line.');
    expect(text).toContain('• Symptom A');
    expect(text).toContain('• Question 1?');
    expect(text).toContain('Watch since:');
  });
});
