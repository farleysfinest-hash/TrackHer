export const APP_NAME = 'TrackHer';
export const APP_VERSION = '0.1.0';

export const PASSWORD_MIN_LENGTH = 8;

export const MENOPAUSE_STAGES = [
  {
    value: 'perimenopause' as const,
    label: 'Perimenopause',
    description:
      'I am still having periods (regular or irregular) and experiencing symptoms like hot flashes, mood changes, or sleep problems.',
  },
  {
    value: 'menopause' as const,
    label: 'Menopause',
    description:
      'I have gone 12 consecutive months without a menstrual period (not due to pregnancy, surgery, or certain medications).',
  },
  {
    value: 'postmenopause' as const,
    label: 'Postmenopause',
    description: 'It has been more than 12 months since my last period.',
  },
  {
    value: 'surgical' as const,
    label: 'Surgical Menopause',
    description:
      'My menopause was caused by surgical removal of both ovaries or by medical treatment.',
  },
  {
    value: 'unknown' as const,
    label: 'Not sure',
    description: "I don't know which stage I'm in, and that's okay.",
  },
] as const;

export const CHECKIN_FREQUENCIES = [
  {
    value: 'daily' as const,
    label: 'Daily',
    description: 'Best for catching patterns quickly. Takes about 1 minute per day.',
  },
  {
    value: 'weekly' as const,
    label: 'Weekly',
    description: 'A good balance of detail and convenience. Reflect on the past 7 days.',
  },
  {
    value: 'monthly' as const,
    label: 'Monthly',
    description: 'Minimal effort. Best for long-term trend tracking.',
  },
] as const;

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/medications', label: 'Medications' },
  { path: '/checkin', label: 'Check In' },
  { path: '/labs', label: 'Lab Results' },
  { path: '/insights', label: 'Insights' },
] as const;

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Invalid email or password',
  email_not_confirmed: 'Please check your email and verify your account',
  user_already_exists: 'An account with this email already exists',
  weak_password: 'Password is too weak. Use at least 8 characters.',
  invalid_grant: 'Invalid or expired reset link. Please request a new one.',
};

export function getAuthErrorMessage(error: { message?: string; code?: string }): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  if (error.message?.includes('Invalid login credentials')) {
    return AUTH_ERROR_MESSAGES.invalid_credentials;
  }
  if (error.message?.includes('Email not confirmed')) {
    return AUTH_ERROR_MESSAGES.email_not_confirmed;
  }
  return error.message ?? 'Something went wrong. Please try again.';
}
