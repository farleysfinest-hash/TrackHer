import { describe, expect, it } from 'vitest';
import type { Profile } from '../../types/database';
import { hasConfirmedProfileContext } from '../profileContext';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    has_uterus: true,
    has_uterus_confirmed_at: '2026-07-15T00:00:00Z',
    timezone: 'Europe/Berlin',
    timezone_confirmed_at: '2026-07-15T00:00:00Z',
    ...overrides,
  } as Profile;
}

describe('profile context confirmation', () => {
  it('accepts deliberate Yes and No answers', () => {
    expect(hasConfirmedProfileContext(profile({ has_uterus: true }))).toBe(true);
    expect(hasConfirmedProfileContext(profile({ has_uterus: false }))).toBe(true);
  });

  it('does not trust a value without its confirmation timestamp', () => {
    expect(hasConfirmedProfileContext(profile({ has_uterus_confirmed_at: null }))).toBe(false);
  });

  it('requires a confirmed preferred timezone', () => {
    expect(hasConfirmedProfileContext(profile({ timezone_confirmed_at: null }))).toBe(false);
    expect(hasConfirmedProfileContext(profile({ timezone: null }))).toBe(false);
  });
});
