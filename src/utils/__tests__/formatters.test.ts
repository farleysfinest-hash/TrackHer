import { describe, expect, it } from 'vitest';
import { formatDateLong, formatLoggingDate } from '../formatters';

describe('civil-date formatting', () => {
  it('keeps a stored date literal instead of shifting it to the prior day', () => {
    expect(formatDateLong('2026-07-15')).toBe('July 15, 2026');
  });

  it('formats logging dates from their calendar components', () => {
    expect(formatLoggingDate('2026-07-15')).toBe('Wednesday, July 15');
  });
});
