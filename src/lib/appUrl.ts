import { Capacitor } from '@capacitor/core';

/**
 * Canonical public web origin for auth redirects (password reset, email links).
 * Native WKWebView origins like capacitor://localhost are not valid redirect targets.
 */
export function getAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (Capacitor.isNativePlatform()) {
    // Brand domain used in privacy/legal copy. Override with VITE_APP_URL in production.
    return 'https://trackher.app';
  }

  return window.location.origin;
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAppOrigin()}/reset-password`;
}
