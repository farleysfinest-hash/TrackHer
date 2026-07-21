import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

import { Capacitor } from '@capacitor/core';
import { getAppOrigin, getPasswordResetRedirectUrl } from '../appUrl';

describe('getAppOrigin', () => {
  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.unstubAllEnvs();
  });

  it('uses VITE_APP_URL when set', () => {
    vi.stubEnv('VITE_APP_URL', 'https://app.trackher.app/');
    expect(getAppOrigin()).toBe('https://app.trackher.app');
    expect(getPasswordResetRedirectUrl()).toBe('https://app.trackher.app/reset-password');
  });

  it('falls back to trackher.app on native without env', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(getAppOrigin()).toBe('https://trackher.app');
  });
});
