import { describe, expect, it } from 'vitest';
import { validators, validateFields } from '../validation';

describe('validators.dateNotFuture', () => {
  // The bug this replaced: `new Date("YYYY-MM-DD") <= new Date()` parsed the value as UTC
  // midnight and compared it against an instant. That failed in both directions depending on the
  // sign of the user's UTC offset, and it gated medication start dates.
  const today = '2026-07-26';

  it('accepts today', () => {
    expect(validators.dateNotFuture(today, today)).toBeNull();
  });

  it('accepts a past date', () => {
    expect(validators.dateNotFuture('2026-07-25', today)).toBeNull();
  });

  it('rejects tomorrow', () => {
    expect(validators.dateNotFuture('2026-07-27', today)).toBe('Date cannot be in the future');
  });

  it('accepts today east of UTC, where the old comparison rejected it', () => {
    // Pacific/Auckland at 10am on the 26th is 21:00 UTC on the 25th, so UTC-midnight parsing put
    // "today" ahead of `new Date()` and blocked it for most of the working day.
    expect(validators.dateNotFuture('2026-07-26', '2026-07-26')).toBeNull();
  });

  it('rejects tomorrow west of UTC, where the old comparison accepted it', () => {
    // America/Los_Angeles at 8pm on the 25th is 03:00 UTC on the 26th, so the 26th parsed as
    // UTC midnight compared as already past and a future date sailed through.
    expect(validators.dateNotFuture('2026-07-26', '2026-07-25')).toBe(
      'Date cannot be in the future',
    );
  });

  it('treats an empty value as not-a-date rather than the epoch', () => {
    // `new Date('')` is Invalid Date, and every comparison against it is false — so the old
    // implementation reported empty input as valid by accident. Required-ness is `validators.required`.
    expect(validators.dateNotFuture('', today)).toBeNull();
  });

  it('compares calendar days, not instants, across a month boundary', () => {
    expect(validators.dateNotFuture('2026-08-01', '2026-07-31')).toBe(
      'Date cannot be in the future',
    );
    expect(validators.dateNotFuture('2026-07-31', '2026-08-01')).toBeNull();
  });
});

describe('validateFields', () => {
  it('keeps only the fields that produced an error', () => {
    expect(
      validateFields({
        email: null,
        password: 'This field is required',
      }),
    ).toEqual({ password: 'This field is required' });
  });

  it('returns an empty object when everything passes', () => {
    expect(validateFields({ email: null, password: null })).toEqual({});
  });
});
