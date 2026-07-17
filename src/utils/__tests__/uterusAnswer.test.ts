import { describe, expect, it } from 'vitest';
import { deriveUterusAnswer, uterusAnswerToValue } from '../uterusAnswer';
import { useOnboardingStore } from '../../stores/onboardingStore';

const TS = '2026-07-17T00:00:00.000Z';

describe('deriveUterusAnswer', () => {
  it('returns yes for confirmed true', () => {
    expect(deriveUterusAnswer({ has_uterus: true, has_uterus_confirmed_at: TS })).toBe('yes');
  });

  it('returns no for confirmed false', () => {
    expect(deriveUterusAnswer({ has_uterus: false, has_uterus_confirmed_at: TS })).toBe('no');
  });

  it('returns unsure for confirmed null — an answered state, not a missing one', () => {
    expect(deriveUterusAnswer({ has_uterus: null, has_uterus_confirmed_at: TS })).toBe('unsure');
  });

  it('returns null when never answered, even if a legacy boolean is present', () => {
    expect(deriveUterusAnswer({ has_uterus: true, has_uterus_confirmed_at: null })).toBe(null);
    expect(deriveUterusAnswer({ has_uterus: null, has_uterus_confirmed_at: null })).toBe(null);
    expect(deriveUterusAnswer(null)).toBe(null);
    expect(deriveUterusAnswer(undefined)).toBe(null);
  });
});

describe('uterusAnswerToValue', () => {
  it('maps yes to true, no to false, unsure to null', () => {
    expect(uterusAnswerToValue('yes')).toBe(true);
    expect(uterusAnswerToValue('no')).toBe(false);
    expect(uterusAnswerToValue('unsure')).toBe(null);
  });
});

describe('submitOnboarding uterus gate', () => {
  it('rejects an unanswered question before any network call', async () => {
    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().updateFormData({
      displayName: 'Test',
      hasUterus: null,
      hasUterusConfirmed: false,
      timezone: 'America/Los_Angeles',
    });
    const result = await useOnboardingStore.getState().submitOnboarding();
    expect(result.success).toBe(false);
    expect(result.error).toContain('uterus');
  });

  it('accepts a confirmed unsure answer at the uterus gate (proved via the next validation failing instead)', async () => {
    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().updateFormData({
      displayName: 'Test',
      hasUterus: null,
      hasUterusConfirmed: true,
      timezone: 'Not/AZone',
    });
    const result = await useOnboardingStore.getState().submitOnboarding();
    expect(result.success).toBe(false);
    expect(result.error).toContain('time zone');
  });
});
