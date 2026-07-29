import { describe, expect, it } from 'vitest';
import { clampPartnerLetter, partnerLetterCacheKey } from '../aiPartnerLetter';

describe('clampPartnerLetter', () => {
  it('returns null for empty and caps length', () => {
    expect(clampPartnerLetter('  ')).toBeNull();
    expect(clampPartnerLetter('x'.repeat(7000))?.length).toBe(6000);
  });
});

describe('partnerLetterCacheKey', () => {
  it('changes when freeText changes', () => {
    expect(partnerLetterCacheKey('abc', '')).not.toBe(partnerLetterCacheKey('abc', 'please include sleep'));
    expect(partnerLetterCacheKey('abc', '')).toBe(partnerLetterCacheKey('abc', ''));
  });
});
