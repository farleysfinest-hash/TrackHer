import { todayISO } from './localDate';

export const validators = {
  required: (value: unknown): string | null =>
    value === null || value === undefined || value === '' ? 'This field is required' : null,

  email: (value: string): string | null =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Please enter a valid email address',

  minLength: (min: number) => (value: string): string | null =>
    value.length >= min ? null : `Must be at least ${min} characters`,

  passwordMatch: (password: string) => (confirmPassword: string): string | null =>
    password === confirmPassword ? null : 'Passwords do not match',

  /**
   * Compares calendar days in the user's own zone.
   *
   * This used to be `new Date(value) <= new Date()`, which parses "YYYY-MM-DD" as UTC midnight
   * and compares it against an instant. That was wrong in both directions: east of UTC it
   * rejected today as "in the future" for most of the working day, and west of UTC it accepted
   * tomorrow's date after local evening. Lab draws, medication start dates and dates of birth
   * were all validated through it.
   *
   * `todayISO()` resolves the device zone (profile preference as fallback), and ISO calendar
   * dates compare correctly as strings, so no instant arithmetic is involved.
   */
  dateNotFuture: (value: string, today: string = todayISO()): string | null => {
    if (!value) return null;
    return value <= today ? null : 'Date cannot be in the future';
  },
};

export function validateFields(
  fields: Record<string, string | null>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, error] of Object.entries(fields)) {
    if (error) errors[key] = error;
  }
  return errors;
}
