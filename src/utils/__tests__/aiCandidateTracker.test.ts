import { describe, expect, it } from 'vitest';
import {
  hashAiCandidateTitle,
  isAiCandidateEventAction,
} from '../aiCandidateTracker';

describe('hashAiCandidateTitle', () => {
  it('is stable and case-insensitive', () => {
    expect(hashAiCandidateTitle('Sleep climbing')).toBe(
      hashAiCandidateTitle('  sleep climbing  '),
    );
    expect(hashAiCandidateTitle('A')).not.toBe(hashAiCandidateTitle('B'));
  });
});

describe('isAiCandidateEventAction', () => {
  it('allows only shown/dismissed/opened', () => {
    expect(isAiCandidateEventAction('shown')).toBe(true);
    expect(isAiCandidateEventAction('dismissed')).toBe(true);
    expect(isAiCandidateEventAction('opened')).toBe(true);
    expect(isAiCandidateEventAction('deleted')).toBe(false);
  });
});
