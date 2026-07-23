import { describe, expect, it } from 'vitest';
import { resolvePostCheckinNudge } from '../PostCheckinNudge';
import { addDaysISO } from '../../../utils/localDate';
import { EXPERIMENT_WINDOW_DAYS } from '../../../utils/medicationHelpers';

const TODAY = '2026-07-22';

describe('resolvePostCheckinNudge', () => {
  it('returns dose_followup when the most recent window ended within 7 days', () => {
    const changeDate = addDaysISO(TODAY, -(EXPERIMENT_WINDOW_DAYS + 3));
    expect(
      resolvePostCheckinNudge({
        today: TODAY,
        changes: [{ change_date: changeDate }],
        labs: [{ draw_date: TODAY }],
        medications: [{ is_active: true, start_date: '2025-01-01', end_date: null }],
      }),
    ).toBe('dose_followup');
  });

  it('skips dose_followup when the window has not ended yet', () => {
    const changeDate = addDaysISO(TODAY, -5);
    expect(
      resolvePostCheckinNudge({
        today: TODAY,
        changes: [{ change_date: changeDate }],
        labs: [{ draw_date: TODAY }],
        medications: [{ is_active: true, start_date: '2025-01-01', end_date: null }],
      }),
    ).toBeNull();
  });

  it('returns stale_labs when labs are 60+ days old', () => {
    expect(
      resolvePostCheckinNudge({
        today: TODAY,
        changes: [],
        labs: [{ draw_date: addDaysISO(TODAY, -60) }],
        medications: [{ is_active: true, start_date: '2025-01-01', end_date: null }],
      }),
    ).toBe('stale_labs');
  });

  it('returns stale_labs when user has medications but no labs', () => {
    expect(
      resolvePostCheckinNudge({
        today: TODAY,
        changes: [],
        labs: [],
        medications: [{ is_active: true, start_date: '2025-01-01', end_date: null }],
      }),
    ).toBe('stale_labs');
  });

  it('returns stale_meds when active meds have no activity for 120+ days', () => {
    expect(
      resolvePostCheckinNudge({
        today: TODAY,
        changes: [{ change_date: addDaysISO(TODAY, -120) }],
        labs: [{ draw_date: TODAY }],
        medications: [
          {
            is_active: true,
            start_date: addDaysISO(TODAY, -200),
            end_date: null,
            updated_at: `${addDaysISO(TODAY, -150)}T12:00:00Z`,
          },
        ],
      }),
    ).toBe('stale_meds');
  });

  it('prefers dose_followup over stale_labs', () => {
    const changeDate = addDaysISO(TODAY, -(EXPERIMENT_WINDOW_DAYS + 1));
    expect(
      resolvePostCheckinNudge({
        today: TODAY,
        changes: [{ change_date: changeDate }],
        labs: [],
        medications: [{ is_active: true, start_date: '2025-01-01', end_date: null }],
      }),
    ).toBe('dose_followup');
  });

  it('returns null when nothing is relevant', () => {
    expect(
      resolvePostCheckinNudge({
        today: TODAY,
        changes: [{ change_date: addDaysISO(TODAY, -5) }],
        labs: [{ draw_date: addDaysISO(TODAY, -10) }],
        medications: [
          {
            is_active: true,
            start_date: addDaysISO(TODAY, -30),
            end_date: null,
            updated_at: `${addDaysISO(TODAY, -10)}T12:00:00Z`,
          },
        ],
      }),
    ).toBeNull();
  });
});
