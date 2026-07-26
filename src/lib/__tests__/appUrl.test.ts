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
    vi.unstubAllGlobals();
  });

  it('uses VITE_APP_URL on native, where the webview origin is unusable', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.stubEnv('VITE_APP_URL', 'https://app.trackher.app/');
    expect(getAppOrigin()).toBe('https://app.trackher.app');
    expect(getPasswordResetRedirectUrl()).toBe('https://app.trackher.app/reset-password');
  });

  it('falls back to trackher.app on native without env', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(getAppOrigin()).toBe('https://trackher.app');
  });

  it('returns the live origin on web even when VITE_APP_URL is set', () => {
    // Regression: preferring the env var mailed every localhost password reset to production,
    // so the link opened a different origin with no session and appeared to do nothing.
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    vi.stubEnv('VITE_APP_URL', 'https://trackher.app');

    expect(getAppOrigin()).toBe('http://localhost:5173');
    expect(getPasswordResetRedirectUrl()).toBe('http://localhost:5173/reset-password');
  });

  it('keeps a deployed web build pointing at its own origin', () => {
    vi.stubGlobal('window', { location: { origin: 'https://trackher.app' } });
    vi.stubEnv('VITE_APP_URL', 'https://trackher.app');

    expect(getAppOrigin()).toBe('https://trackher.app');
  });

  it('falls back to the configured URL when there is no window at all', () => {
    // Server-side render or a worker context: no origin to read.
    vi.stubGlobal('window', undefined);
    vi.stubEnv('VITE_APP_URL', 'https://trackher.app');

    expect(getAppOrigin()).toBe('https://trackher.app');
  });
});
