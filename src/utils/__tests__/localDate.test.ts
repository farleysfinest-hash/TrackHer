import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  addMonthsISO,
  dateISOInTimeZone,
  dayOfWeekISO,
  daysBetweenISO,
  getEventLocalMetadata,
  parseISODate,
  todayISO,
} from '../localDate';

describe('civil-date arithmetic', () => {
  it('counts consecutive dates as one day across US spring DST', () => {
    expect(daysBetweenISO('2026-03-07', '2026-03-08')).toBe(1);
  });

  it('counts consecutive dates as one day across European spring DST', () => {
    expect(daysBetweenISO('2026-03-28', '2026-03-29')).toBe(1);
  });

  it('preserves signed differences and leap days', () => {
    expect(daysBetweenISO('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetweenISO('2024-03-01', '2024-02-28')).toBe(-2);
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('clamps calendar-month changes', () => {
    expect(addMonthsISO('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonthsISO('2024-03-31', -1)).toBe('2024-02-29');
  });

  it('calculates weekday without depending on the runtime timezone', () => {
    expect(dayOfWeekISO('2026-07-15')).toBe(3);
  });

  it('rejects impossible calendar dates', () => {
    expect(() => parseISODate('2026-02-30')).toThrow('Invalid calendar date');
  });
});

describe('instant conversion', () => {
  const instant = '2026-07-15T23:30:00Z';

  it('assigns the same instant to its actual date in each IANA timezone', () => {
    expect(dateISOInTimeZone(instant, 'America/Los_Angeles')).toBe('2026-07-15');
    expect(dateISOInTimeZone(instant, 'America/New_York')).toBe('2026-07-15');
    expect(dateISOInTimeZone(instant, 'Europe/Berlin')).toBe('2026-07-16');
    expect(dateISOInTimeZone(instant, 'Asia/Tokyo')).toBe('2026-07-16');
  });

  it('derives event-local date and offset at the exact instant', () => {
    expect(getEventLocalMetadata(instant, 'Europe/Berlin')).toEqual({
      timezone: 'Europe/Berlin',
      localDate: '2026-07-16',
      utcOffsetMinutes: 120,
    });
    expect(getEventLocalMetadata('2026-01-15T23:30:00Z', 'Europe/Berlin').utcOffsetMinutes).toBe(60);
  });

  it('derives today from the requested zone rather than UTC', () => {
    const now = new Date(instant);
    expect(todayISO('Europe/Berlin', now)).toBe('2026-07-16');
    expect(todayISO('America/Los_Angeles', now)).toBe('2026-07-15');
  });
});
