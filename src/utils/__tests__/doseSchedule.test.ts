import { describe, expect, it } from 'vitest';
import type {
  Medication,
  MedicationAdministration,
  MedicationFrequency,
} from '../../types/database';
import {
  countDosesOutstandingToday,
  getDoseCadence,
  getDoseStatus,
  getOutstandingFirstDoseStatuses,
  isDoseLoggable,
} from '../doseSchedule';

const TODAY = '2026-07-25';
const ZONE = 'America/New_York';

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    user_id: 'user-1',
    hormone_category: 'estrogen',
    delivery_method: 'patch',
    medication_name: 'Vivelle-Dot',
    dose_amount: 0.025,
    dose_unit: 'mg',
    units_per_dose: 1,
    secondary_dose_amount: null,
    secondary_dose_unit: null,
    tertiary_dose_amount: null,
    tertiary_dose_unit: null,
    frequency: 'daily',
    frequency_details: null,
    application_site: null,
    start_date: '2026-01-01',
    end_date: null,
    is_active: true,
    prescriber_name: null,
    pharmacy_name: null,
    notes: null,
    pellet_insertion_date: null,
    pellet_expected_duration_months: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Administrations are keyed off their immutable local_date, mirroring how they are written. */
function makeAdministration(localDate: string, medicationId = 'med-1'): MedicationAdministration {
  return {
    id: `admin-${medicationId}-${localDate}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: 'user-1',
    medication_id: medicationId,
    taken_at: `${localDate}T14:00:00Z`,
    event_timezone: ZONE,
    local_date: localDate,
    utc_offset_minutes: -240,
    created_at: `${localDate}T14:00:00Z`,
  };
}

describe('getDoseCadence', () => {
  it.each<[MedicationFrequency, string, number]>([
    ['daily', 'per_day', 1],
    ['twice_daily', 'per_day', 2],
    ['three_times_daily', 'per_day', 3],
  ])('resolves %s to %s with %i doses per due day', (frequency, kind, doses) => {
    const cadence = getDoseCadence(makeMedication({ frequency }));
    expect(cadence.kind).toBe(kind);
    expect(cadence.dosesPerDueDay).toBe(doses);
    expect(cadence.loggable).toBe(true);
  });

  it.each<[MedicationFrequency, number]>([
    ['every_other_day', 2],
    ['weekly', 7],
    ['every_two_weeks', 14],
    ['every_three_weeks', 21],
    ['every_four_weeks', 28],
  ])('resolves %s to a %i-day interval', (frequency, days) => {
    const cadence = getDoseCadence(makeMedication({ frequency }));
    expect(cadence.kind).toBe('interval_days');
    expect(cadence.intervalDays).toBe(days);
  });

  it.each<[MedicationFrequency, number]>([
    ['monthly', 1],
    ['every_three_months', 3],
    ['every_six_months', 6],
  ])('resolves %s to a %i-month interval', (frequency, months) => {
    const cadence = getDoseCadence(makeMedication({ frequency }));
    expect(cadence.kind).toBe('interval_months');
    expect(cadence.intervalMonths).toBe(months);
  });

  it.each<[MedicationFrequency, number]>([
    ['twice_weekly', 2],
    ['three_times_weekly', 3],
  ])('resolves %s to %i doses per rolling week', (frequency, perWeek) => {
    const cadence = getDoseCadence(makeMedication({ frequency }));
    expect(cadence.kind).toBe('per_week');
    expect(cadence.dosesPerWeek).toBe(perWeek);
  });

  it('reads days_on and days_off for a cyclic regimen', () => {
    const cadence = getDoseCadence(
      makeMedication({ frequency: 'cyclic', frequency_details: { days_on: 12, days_off: 16 } }),
    );
    expect(cadence.kind).toBe('cyclic');
    expect(cadence.cycleDaysOn).toBe(12);
    expect(cadence.cycleDaysOff).toBe(16);
    expect(cadence.label).toBe('12 on / 16 off');
  });

  it('degrades a cyclic regimen with unusable details to on-demand instead of inventing a cycle', () => {
    const cadence = getDoseCadence(
      makeMedication({ frequency: 'cyclic', frequency_details: { days_on: 0, days_off: 0 } }),
    );
    expect(cadence.kind).toBe('on_demand');
    expect(cadence.loggable).toBe(true);
  });

  it.each<MedicationFrequency>(['as_needed', 'custom'])(
    'treats %s as on-demand so it is loggable but never overdue',
    (frequency) => {
      expect(getDoseCadence(makeMedication({ frequency })).kind).toBe('on_demand');
    },
  );

  it('never offers a chip for pellets, whatever the frequency says', () => {
    const cadence = getDoseCadence(
      makeMedication({ delivery_method: 'pellet', frequency: 'every_four_months' }),
    );
    expect(cadence.loggable).toBe(false);
  });
});

describe('isDoseLoggable', () => {
  it('excludes discontinued medications', () => {
    expect(isDoseLoggable(makeMedication({ is_active: false }), TODAY)).toBe(false);
  });

  it('excludes a course that has not started yet', () => {
    expect(isDoseLoggable(makeMedication({ start_date: '2026-08-01' }), TODAY)).toBe(false);
  });

  it('excludes a course that already ended', () => {
    expect(isDoseLoggable(makeMedication({ end_date: '2026-07-24' }), TODAY)).toBe(false);
  });

  it('includes an active course that ends today', () => {
    expect(isDoseLoggable(makeMedication({ end_date: TODAY }), TODAY)).toBe(true);
  });
});

describe('getDoseStatus — multiple doses per day', () => {
  it('does not mark a twice-daily medication complete after a single dose', () => {
    const med = makeMedication({ frequency: 'twice_daily' });
    const status = getDoseStatus(med, [makeAdministration(TODAY)], TODAY, ZONE);

    expect(status.state).toBe('partial_today');
    expect(status.takenToday).toBe(1);
    expect(status.expectedToday).toBe(2);
    expect(status.satisfied).toBe(false);
    expect(status.tapLogsDose).toBe(true);
    expect(status.detail).toBe('1 of 2 today');
  });

  it('completes a twice-daily medication only once both doses are logged', () => {
    const med = makeMedication({ frequency: 'twice_daily' });
    const status = getDoseStatus(
      med,
      [makeAdministration(TODAY), makeAdministration(TODAY)],
      TODAY,
      ZONE,
    );

    expect(status.state).toBe('complete_today');
    expect(status.satisfied).toBe(true);
    expect(status.tapLogsDose).toBe(false);
    expect(status.detail).toBe('2 of 2 today');
  });

  it('ignores yesterday when counting a daily medication', () => {
    const med = makeMedication({ frequency: 'daily' });
    const status = getDoseStatus(med, [makeAdministration('2026-07-24')], TODAY, ZONE);

    expect(status.state).toBe('due_today');
    expect(status.takenToday).toBe(0);
    expect(status.detail).toBe('Due today');
  });
});

describe('getDoseStatus — day intervals', () => {
  it('keeps a weekly patch covered inside its cycle and names the next date', () => {
    const med = makeMedication({ frequency: 'weekly' });
    const status = getDoseStatus(med, [makeAdministration('2026-07-22')], TODAY, ZONE);

    expect(status.state).toBe('covered');
    expect(status.satisfied).toBe(true);
    expect(status.tapLogsDose).toBe(false);
    expect(status.nextDueDate).toBe('2026-07-29');
    expect(status.detail).toBe('Next in 4 days');
  });

  it('marks a weekly patch due once the interval elapses', () => {
    const med = makeMedication({ frequency: 'weekly' });
    const status = getDoseStatus(med, [makeAdministration('2026-07-18')], TODAY, ZONE);

    expect(status.state).toBe('due_today');
    expect(status.satisfied).toBe(false);
    expect(status.detail).toBe('Due today');
  });

  it('does not prompt an every-other-day medication on its off day', () => {
    const med = makeMedication({ frequency: 'every_other_day' });
    const status = getDoseStatus(med, [makeAdministration('2026-07-24')], TODAY, ZONE);

    expect(status.state).toBe('covered');
    expect(status.expectedToday).toBe(0);
    expect(status.nextDueDate).toBe('2026-07-26');
    expect(status.detail).toBe('Next tomorrow');
  });

  it('prompts an every-other-day medication on its on day', () => {
    const med = makeMedication({ frequency: 'every_other_day' });
    const status = getDoseStatus(med, [makeAdministration('2026-07-23')], TODAY, ZONE);

    expect(status.state).toBe('due_today');
    expect(status.expectedToday).toBe(1);
  });

  it('treats a never-logged interval medication as due today', () => {
    const med = makeMedication({ frequency: 'every_two_weeks' });
    const status = getDoseStatus(med, [], TODAY, ZONE);

    expect(status.state).toBe('due_today');
    expect(status.nextDueDate).toBe(TODAY);
    expect(status.lastDoseDate).toBeNull();
  });
});

describe('getDoseStatus — month intervals', () => {
  it('uses calendar months rather than 30-day arithmetic', () => {
    const med = makeMedication({ frequency: 'monthly', delivery_method: 'injection' });
    const status = getDoseStatus(med, [makeAdministration('2026-06-30')], TODAY, ZONE);

    // 30 days after Jun 30 would already be due; one calendar month is not.
    expect(status.state).toBe('covered');
    expect(status.nextDueDate).toBe('2026-07-30');
    expect(status.detail).toBe('Next in 5 days');
  });

  it('names an absolute date once the next dose is more than a week away', () => {
    const med = makeMedication({ frequency: 'every_three_months', delivery_method: 'injection' });
    const status = getDoseStatus(med, [makeAdministration('2026-07-20')], TODAY, ZONE);

    expect(status.detail).toBe('Next Oct 20');
  });

  it('becomes due once the calendar month has elapsed', () => {
    const med = makeMedication({ frequency: 'monthly', delivery_method: 'injection' });
    const status = getDoseStatus(med, [makeAdministration('2026-06-25')], TODAY, ZONE);

    expect(status.state).toBe('due_today');
    expect(status.nextDueDate).toBe('2026-07-25');
  });

  it('clamps to the last valid day when the target month is shorter', () => {
    const med = makeMedication({ frequency: 'monthly', delivery_method: 'injection' });
    const status = getDoseStatus(med, [makeAdministration('2026-01-31')], '2026-02-20', ZONE);

    expect(status.nextDueDate).toBe('2026-02-28');
  });
});

describe('getDoseStatus — doses per rolling week', () => {
  it('counts progress across the trailing seven days', () => {
    const med = makeMedication({ frequency: 'twice_weekly' });
    const status = getDoseStatus(med, [makeAdministration('2026-07-21')], TODAY, ZONE);

    expect(status.state).toBe('partial_today');
    expect(status.takenThisWeek).toBe(1);
    expect(status.detail).toBe('1 of 2 this week');
    expect(status.tapLogsDose).toBe(true);
  });

  it('drops doses that fall outside the rolling window', () => {
    const med = makeMedication({ frequency: 'twice_weekly' });
    const status = getDoseStatus(med, [makeAdministration('2026-07-18')], TODAY, ZONE);

    expect(status.takenThisWeek).toBe(0);
    expect(status.state).toBe('due_today');
  });

  it('is satisfied once the weekly count is met', () => {
    const med = makeMedication({ frequency: 'three_times_weekly' });
    const status = getDoseStatus(
      med,
      [
        makeAdministration('2026-07-20'),
        makeAdministration('2026-07-22'),
        makeAdministration('2026-07-24'),
      ],
      TODAY,
      ZONE,
    );

    expect(status.state).toBe('covered');
    expect(status.satisfied).toBe(true);
    expect(status.detail).toBe('3 of 3 this week');
  });
});

describe('getDoseStatus — cyclic', () => {
  const cyclic = makeMedication({
    frequency: 'cyclic',
    delivery_method: 'oral_capsule',
    frequency_details: { days_on: 12, days_off: 16 },
    start_date: '2026-07-01',
  });

  it('prompts on an on-day', () => {
    // 2026-07-25 is day 24 of the cycle; 24 % 28 = 24, which is past the 12 on-days.
    const onDay = getDoseStatus(cyclic, [], '2026-07-05', ZONE);
    expect(onDay.state).toBe('due_today');
    expect(onDay.detail).toBe('Due today');
  });

  it('stays quiet on an off-day and names the next on-day', () => {
    const offDay = getDoseStatus(cyclic, [], TODAY, ZONE);
    expect(offDay.state).toBe('not_due_today');
    expect(offDay.expectedToday).toBe(0);
    expect(offDay.nextDueDate).toBe('2026-07-29');
    expect(offDay.tapLogsDose).toBe(false);
  });

  it('does not report a cycle position before the course starts', () => {
    const status = getDoseStatus(cyclic, [], '2026-06-20', ZONE);
    expect(status.state).toBe('not_due_today');
    expect(status.detail).toBe('Starts Jul 1');
  });
});

describe('getDoseStatus — on demand', () => {
  it('never reports an as-needed medication as overdue', () => {
    const med = makeMedication({ frequency: 'as_needed', delivery_method: 'oral_tablet' });
    const status = getDoseStatus(med, [], TODAY, ZONE);

    expect(status.state).toBe('on_demand');
    expect(status.expectedToday).toBe(0);
    expect(status.detail).toBe('Tap if taken');
  });

  it('shows how many as-needed doses were taken today', () => {
    const med = makeMedication({ frequency: 'as_needed', delivery_method: 'oral_tablet' });
    const status = getDoseStatus(med, [makeAdministration(TODAY)], TODAY, ZONE);

    expect(status.detail).toBe('1 today');
    expect(status.satisfied).toBe(true);
  });
});

describe('getDoseStatus — timezone handling', () => {
  it('prefers the immutable event-local date over the fallback zone', () => {
    const med = makeMedication({ frequency: 'daily' });
    const crossesUtcMidnight: MedicationAdministration = {
      ...makeAdministration(TODAY),
      // 9pm New York on the 25th is already the 26th in UTC.
      taken_at: '2026-07-26T01:00:00Z',
      local_date: TODAY,
    };

    expect(getDoseStatus(med, [crossesUtcMidnight], TODAY, ZONE).takenToday).toBe(1);
  });

  it('falls back to the supplied zone for legacy rows without local metadata', () => {
    const med = makeMedication({ frequency: 'daily' });
    const legacy: MedicationAdministration = {
      ...makeAdministration(TODAY),
      taken_at: '2026-07-26T01:00:00Z',
      local_date: null,
      event_timezone: null,
    };

    expect(getDoseStatus(med, [legacy], TODAY, ZONE).takenToday).toBe(1);
    expect(getDoseStatus(med, [legacy], '2026-07-26', 'UTC').takenToday).toBe(1);
  });
});

describe('getOutstandingFirstDoseStatuses', () => {
  const daily = makeMedication({ id: 'daily', medication_name: 'Prometrium', frequency: 'daily' });
  const weekly = makeMedication({ id: 'weekly', medication_name: 'Estradiol patch', frequency: 'weekly' });
  const pellet = makeMedication({ id: 'pellet', medication_name: 'Pellet', delivery_method: 'pellet' });

  it('puts outstanding doses first and drops medications with no chip', () => {
    const ordered = getOutstandingFirstDoseStatuses(
      [weekly, pellet, daily],
      [makeAdministration('2026-07-24', 'weekly')],
      TODAY,
      ZONE,
    );

    expect(ordered.map((entry) => entry.medication.id)).toEqual(['daily', 'weekly']);
    expect(ordered[0].status.state).toBe('due_today');
    expect(ordered[1].status.state).toBe('covered');
  });

  it('counts only what is still expected today', () => {
    const statuses = getOutstandingFirstDoseStatuses(
      [weekly, daily],
      [makeAdministration('2026-07-24', 'weekly'), makeAdministration(TODAY, 'daily')],
      TODAY,
      ZONE,
    );

    expect(countDosesOutstandingToday(statuses)).toBe(0);
  });

  it('counts a partially logged twice-daily medication as outstanding', () => {
    const twiceDaily = makeMedication({ id: 'bid', frequency: 'twice_daily' });
    const statuses = getOutstandingFirstDoseStatuses(
      [twiceDaily],
      [makeAdministration(TODAY, 'bid')],
      TODAY,
      ZONE,
    );

    expect(countDosesOutstandingToday(statuses)).toBe(1);
  });
});
