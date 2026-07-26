import { Capacitor } from '@capacitor/core';

/**
 * Canonical public web origin for auth redirects (password reset, email links).
 * Native WKWebView origins like capacitor://localhost are not valid redirect targets.
 */
export function getAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_APP_URL?.trim().replace(/\/$/, '');

  // Native WKWebView has no usable origin, so the configured public URL is the only option.
  if (Capacitor.isNativePlatform()) {
    return fromEnv || 'https://trackher.app';
  }

  // On the web the user is already somewhere real — send them back to where they actually are.
  // Preferring VITE_APP_URL here mailed every localhost password reset to production, so the
  // link landed on a different origin with no session and appeared to do nothing.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return fromEnv || 'https://trackher.app';
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAppOrigin()}/reset-password`;
}
