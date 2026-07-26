import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUiValue, setUiValue } from '../uiState';
import { useAuthStore } from '../../stores/authStore';
import type { Profile } from '../../types/database';

/**
 * `hydrate` is not exported — it is wired to the auth store subscription at module load, which is
 * the behaviour under test. These drive it the way the app does: by moving the profile.
 */
function setProfile(id: string | null, uiState: Record<string, unknown> = {}): void {
  useAuthStore.setState({
    profile: id === null ? null : ({ id, ui_state: uiState } as unknown as Profile),
  });
}

describe('uiState cache hydration', () => {
  beforeEach(() => {
    // The RPC is fire-and-forget and the test setup makes fetch throw; the .catch in setUiValues
    // handles it, but silence the console noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setProfile(null);
  });

  it('exposes an optimistic write immediately', () => {
    setProfile('user-1');
    setUiValue('viewed_insights', { 'bleeding-red-flag': 1 }, { mirrorToProfile: false });
    expect(getUiValue('viewed_insights')).toEqual({ 'bleeding-red-flag': 1 });
  });

  it('keeps an in-flight optimistic write when the same profile is refetched', () => {
    // The regression: hydrate replaced the cache wholesale, so any fetchProfile landing between
    // the optimistic write and merge_ui_state dropped it — and viewed_insights is written with
    // mirrorToProfile:false, so the cache is the only copy. Safeguarding and bleeding cards
    // reappeared as unread.
    setProfile('user-1', { onboarding_banner_dismissed: true });
    setUiValue('viewed_insights', { 'bleeding-red-flag': 1 }, { mirrorToProfile: false });

    setProfile('user-1', { onboarding_banner_dismissed: true });

    expect(getUiValue('viewed_insights')).toEqual({ 'bleeding-red-flag': 1 });
    expect(getUiValue('onboarding_banner_dismissed')).toBe(true);
  });

  it('lets the server win for keys it knows about', () => {
    setProfile('user-1', { theme: 'light' });
    setUiValue('theme', 'dark');
    setProfile('user-1', { theme: 'light' });
    expect(getUiValue('theme')).toBe('light');
  });

  it('does not carry state across a sign-out', () => {
    setProfile('user-1');
    setUiValue('viewed_insights', { a: 1 }, { mirrorToProfile: false });
    setProfile(null);
    expect(getUiValue('viewed_insights')).toBeUndefined();
  });

  it('does not leak one user’s flags into the next user', () => {
    // Merging unconditionally would fix the wipe and introduce something worse.
    setProfile('user-1');
    setUiValue('viewed_insights', { a: 1 }, { mirrorToProfile: false });
    setProfile('user-2', { theme: 'dark' });

    expect(getUiValue('viewed_insights')).toBeUndefined();
    expect(getUiValue('theme')).toBe('dark');
  });
});
