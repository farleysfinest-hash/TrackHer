export const validators = {
  required: (value: unknown): string | null =>
    value === null || value === undefined || value === '' ? 'This field is required' : null,

  email: (value: string): string | null =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Please enter a valid email address',

  minLength: (min: number) => (value: string): string | null =>
    value.length >= min ? null : `Must be at least ${min} characters`,

  passwordMatch: (password: string) => (confirmPassword: string): string | null =>
    password === confirmPassword ? null : 'Passwords do not match',

  dateNotFuture: (value: string): string | null => {
    const date = new Date(value);
    return date <= new Date() ? null : 'Date cannot be in the future';
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
