/**
 * Dose cadence model.
 *
 * Every medication frequency is resolved into one cadence shape so the UI can answer three
 * questions honestly: is a dose expected today, how many are still outstanding, and when is the
 * next one due. Frequencies we cannot schedule truthfully are marked `on_demand` (always
 * tappable, never nagged) or `untracked` (no chip at all) rather than being guessed at.
 */

import type {
  Medication,
  MedicationAdministration,
  MedicationFrequency,
} from '../types/database';
import { addDaysISO, addMonthsISO, daysBetweenISO, resolveEventLocalDate } from './localDate';

export type DoseCadenceKind =
  | 'per_day'
  | 'interval_days'
  | 'interval_months'
  | 'per_week'
  | 'cyclic'
  | 'on_demand'
  | 'untracked';

export interface DoseCadence {
  kind: DoseCadenceKind;
  /** Short schedule label for the chip, e.g. "Daily", "Twice daily", "Once weekly". */
  label: string;
  /** Doses expected on a day this medication is due. */
  dosesPerDueDay: number;
  /** Whole days between due days, for `interval_days`. */
  intervalDays: number | null;
  /** Whole calendar months between due days, for `interval_months`. */
  intervalMonths: number | null;
  /** Doses expected across a rolling 7-day window, for `per_week`. */
  dosesPerWeek: number | null;
  cycleDaysOn: number | null;
  cycleDaysOff: number | null;
  /** False when a dose-log chip would be meaningless (pellets, unscheduled custom regimens). */
  loggable: boolean;
}

export type DoseDueState =
  /** Expected today, nothing logged yet. */
  | 'due_today'
  /** Expected today, some but not all doses logged. */
  | 'partial_today'
  /** Every dose expected today is logged. */
  | 'complete_today'
  /** Inside a multi-day interval that is already satisfied. */
  | 'covered'
  /** Not expected today (cyclic off-day, or an interval that has not come around). */
  | 'not_due_today'
  /** No fixed schedule — as-needed and custom regimens. */
  | 'on_demand';

export interface DoseStatus {
  state: DoseDueState;
  cadence: DoseCadence;
  /** Doses logged on `today` in the report timezone. */
  takenToday: number;
  /** Doses expected on `today`. Zero when the medication is not due. */
  expectedToday: number;
  /** Doses logged in the trailing 7 days, for `per_week` cadences. */
  takenThisWeek: number;
  lastDoseDate: string | null;
  nextDueDate: string | null;
  /** True when nothing more is expected for the current period. Drives the chip checkmark. */
  satisfied: boolean;
  /** True when the next tap should log a dose rather than undo the previous one. */
  tapLogsDose: boolean;
  /** One-line status for the chip, e.g. "1 of 2 today" or "Next Aug 1". */
  detail: string;
}

/**
 * How far back administration history must reach for every cadence to resolve.
 *
 * The longest interval is six calendar months, so a shorter window would report a medication as
 * due today simply because its last dose fell outside the fetch. One year plus a margin covers it.
 */
export const DOSE_HISTORY_DAYS = 400;

const PER_DAY_DOSES: Partial<Record<MedicationFrequency, number>> = {
  daily: 1,
  twice_daily: 2,
  three_times_daily: 3,
};

const INTERVAL_DAYS: Partial<Record<MedicationFrequency, number>> = {
  every_other_day: 2,
  weekly: 7,
  every_two_weeks: 14,
  every_three_weeks: 21,
  every_four_weeks: 28,
};

const INTERVAL_MONTHS: Partial<Record<MedicationFrequency, number>> = {
  monthly: 1,
  every_three_months: 3,
  every_four_months: 4,
  every_five_months: 5,
  every_six_months: 6,
};

const PER_WEEK_DOSES: Partial<Record<MedicationFrequency, number>> = {
  twice_weekly: 2,
  three_times_weekly: 3,
};

const CADENCE_LABELS: Record<MedicationFrequency, string> = {
  daily: 'Daily',
  twice_daily: 'Twice daily',
  three_times_daily: '3× daily',
  weekly: 'Once weekly',
  twice_weekly: 'Twice weekly',
  three_times_weekly: '3× weekly',
  every_other_day: 'Every other day',
  every_two_weeks: 'Every 2 weeks',
  every_three_weeks: 'Every 3 weeks',
  every_four_weeks: 'Every 4 weeks',
  monthly: 'Monthly',
  cyclic: 'Cyclic',
  as_needed: 'As needed',
  custom: 'Custom schedule',
  every_three_months: 'Every 3 months',
  every_four_months: 'Every 4 months',
  every_five_months: 'Every 5 months',
  every_six_months: 'Every 6 months',
};

function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function baseCadence(frequency: MedicationFrequency): DoseCadence {
  return {
    kind: 'untracked',
    label: CADENCE_LABELS[frequency] ?? String(frequency),
    dosesPerDueDay: 1,
    intervalDays: null,
    intervalMonths: null,
    dosesPerWeek: null,
    cycleDaysOn: null,
    cycleDaysOff: null,
    loggable: false,
  };
}

/**
 * Resolve a medication's frequency into its cadence shape. Pure — no clock, no data access.
 *
 * Pellets are excluded: they are implanted by a provider and are not a self-logged dose. Cyclic
 * regimens without usable `days_on` / `days_off` details degrade to `on_demand` rather than
 * inventing a cycle.
 */
export function getDoseCadence(
  med: Pick<Medication, 'frequency' | 'frequency_details' | 'delivery_method'>,
): DoseCadence {
  const cadence = baseCadence(med.frequency);

  if (med.delivery_method === 'pellet') return cadence;

  const perDay = PER_DAY_DOSES[med.frequency];
  if (perDay) {
    return { ...cadence, kind: 'per_day', dosesPerDueDay: perDay, loggable: true };
  }

  const intervalDays = INTERVAL_DAYS[med.frequency];
  if (intervalDays) {
    return { ...cadence, kind: 'interval_days', intervalDays, loggable: true };
  }

  const intervalMonths = INTERVAL_MONTHS[med.frequency];
  if (intervalMonths) {
    return { ...cadence, kind: 'interval_months', intervalMonths, loggable: true };
  }

  const perWeek = PER_WEEK_DOSES[med.frequency];
  if (perWeek) {
    return { ...cadence, kind: 'per_week', dosesPerWeek: perWeek, loggable: true };
  }

  if (med.frequency === 'cyclic') {
    const daysOn = positiveInt(med.frequency_details?.days_on);
    const daysOff = nonNegativeInt(med.frequency_details?.days_off);
    if (daysOn !== null && daysOff !== null && daysOn + daysOff > 0) {
      return {
        ...cadence,
        kind: 'cyclic',
        cycleDaysOn: daysOn,
        cycleDaysOff: daysOff,
        label: `${daysOn} on / ${daysOff} off`,
        loggable: true,
      };
    }
    return { ...cadence, kind: 'on_demand', loggable: true };
  }

  if (med.frequency === 'as_needed' || med.frequency === 'custom') {
    return { ...cadence, kind: 'on_demand', loggable: true };
  }

  return cadence;
}

/** Local dates of this medication's administrations, newest first. */
function administrationDates(
  medicationId: string,
  administrations: MedicationAdministration[],
  timezone: string,
): string[] {
  return administrations
    .filter((a) => a.medication_id === medicationId)
    .map((a) => resolveEventLocalDate(a.taken_at, a.local_date, a.event_timezone, timezone))
    .sort((a, b) => b.localeCompare(a));
}

function formatShortDate(dateISO: string): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function relativeDueLabel(nextDueDate: string, today: string): string {
  const days = daysBetweenISO(today, nextDueDate);
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Next tomorrow';
  if (days < 7) return `Next in ${days} days`;
  return `Next ${formatShortDate(nextDueDate)}`;
}

/**
 * Whether this medication should offer a dose-log chip on `today`.
 *
 * Excludes inactive medications, pellets, unschedulable frequencies, and medications whose
 * course has not started or has already ended.
 */
export function isDoseLoggable(med: Medication, today: string): boolean {
  if (!med.is_active) return false;
  if (!getDoseCadence(med).loggable) return false;
  if (med.start_date > today) return false;
  if (med.end_date !== null && med.end_date < today) return false;
  return true;
}

/**
 * Current dose position for one medication.
 *
 * `today` and `timezone` are supplied by the caller so this stays deterministic and testable;
 * event-local metadata on each administration wins over the fallback zone.
 */
export function getDoseStatus(
  med: Medication,
  administrations: MedicationAdministration[],
  today: string,
  timezone = 'UTC',
): DoseStatus {
  const cadence = getDoseCadence(med);
  const dates = administrationDates(med.id, administrations, timezone);
  const lastDoseDate = dates[0] ?? null;
  const takenToday = dates.filter((d) => d === today).length;
  const weekStart = addDaysISO(today, -6);
  const takenThisWeek = dates.filter((d) => d >= weekStart && d <= today).length;

  const shared = { cadence, takenToday, takenThisWeek, lastDoseDate };

  if (cadence.kind === 'per_day') {
    const expectedToday = cadence.dosesPerDueDay;
    const satisfied = takenToday >= expectedToday;
    const state: DoseDueState = satisfied
      ? 'complete_today'
      : takenToday > 0
        ? 'partial_today'
        : 'due_today';
    return {
      ...shared,
      state,
      expectedToday,
      nextDueDate: satisfied ? addDaysISO(today, 1) : today,
      satisfied,
      tapLogsDose: !satisfied,
      detail:
        expectedToday > 1
          ? `${takenToday} of ${expectedToday} today`
          : satisfied
            ? 'Logged today'
            : 'Due today',
    };
  }

  if (cadence.kind === 'interval_days' || cadence.kind === 'interval_months') {
    const nextDueDate = !lastDoseDate
      ? today
      : cadence.kind === 'interval_days'
        ? addDaysISO(lastDoseDate, cadence.intervalDays as number)
        : addMonthsISO(lastDoseDate, cadence.intervalMonths as number);
    const due = nextDueDate <= today;
    const satisfied = !due;
    return {
      ...shared,
      state: due ? (takenToday > 0 ? 'complete_today' : 'due_today') : 'covered',
      expectedToday: due ? 1 : 0,
      nextDueDate,
      satisfied,
      tapLogsDose: due,
      detail: due ? 'Due today' : relativeDueLabel(nextDueDate, today),
    };
  }

  if (cadence.kind === 'per_week') {
    const expectedInWindow = cadence.dosesPerWeek as number;
    const satisfied = takenThisWeek >= expectedInWindow;
    return {
      ...shared,
      state: satisfied ? 'covered' : takenThisWeek > 0 ? 'partial_today' : 'due_today',
      expectedToday: satisfied ? 0 : 1,
      nextDueDate: satisfied && lastDoseDate ? addDaysISO(weekStart, 7) : today,
      satisfied,
      tapLogsDose: !satisfied,
      detail: `${takenThisWeek} of ${expectedInWindow} this week`,
    };
  }

  if (cadence.kind === 'cyclic') {
    const daysOn = cadence.cycleDaysOn as number;
    const cycleLength = daysOn + (cadence.cycleDaysOff as number);
    const elapsed = daysBetweenISO(med.start_date, today);
    // Before the course starts there is no cycle position to report.
    if (elapsed < 0) {
      return {
        ...shared,
        state: 'not_due_today',
        expectedToday: 0,
        nextDueDate: med.start_date,
        satisfied: true,
        tapLogsDose: false,
        detail: `Starts ${formatShortDate(med.start_date)}`,
      };
    }
    const dayInCycle = elapsed % cycleLength;
    const onDay = dayInCycle < daysOn;
    if (!onDay) {
      const nextDueDate = addDaysISO(today, cycleLength - dayInCycle);
      return {
        ...shared,
        state: 'not_due_today',
        expectedToday: 0,
        nextDueDate,
        satisfied: true,
        tapLogsDose: false,
        detail: relativeDueLabel(nextDueDate, today),
      };
    }
    const expectedToday = cadence.dosesPerDueDay;
    const satisfied = takenToday >= expectedToday;
    return {
      ...shared,
      state: satisfied ? 'complete_today' : 'due_today',
      expectedToday,
      nextDueDate: today,
      satisfied,
      tapLogsDose: !satisfied,
      detail: satisfied ? `Logged · day ${dayInCycle + 1} of ${daysOn} on` : 'Due today',
    };
  }

  // on_demand and untracked: never nagged, always loggable when a chip is shown.
  return {
    ...shared,
    state: 'on_demand',
    expectedToday: 0,
    nextDueDate: null,
    satisfied: takenToday > 0,
    tapLogsDose: true,
    detail: takenToday > 0 ? `${takenToday} today` : 'Tap if taken',
  };
}

export interface MedicationDoseStatus {
  medication: Medication;
  status: DoseStatus;
}

/**
 * Dose statuses for every loggable medication, ordered so anything still outstanding today
 * comes first. Medications with nothing expected sink to the bottom.
 */
export function getOutstandingFirstDoseStatuses(
  medications: Medication[],
  administrations: MedicationAdministration[],
  today: string,
  timezone = 'UTC',
): MedicationDoseStatus[] {
  const rank: Record<DoseDueState, number> = {
    due_today: 0,
    partial_today: 1,
    on_demand: 2,
    complete_today: 3,
    covered: 4,
    not_due_today: 5,
  };

  return medications
    .filter((med) => isDoseLoggable(med, today))
    .map((medication) => ({
      medication,
      status: getDoseStatus(medication, administrations, today, timezone),
    }))
    .sort((a, b) => {
      const byState = rank[a.status.state] - rank[b.status.state];
      if (byState !== 0) return byState;
      return a.medication.medication_name.localeCompare(b.medication.medication_name);
    });
}

/** Count of medications with a dose still expected today. Drives the check-in prompt copy. */
export function countDosesOutstandingToday(statuses: MedicationDoseStatus[]): number {
  return statuses.filter(
    (entry) => entry.status.state === 'due_today' || entry.status.state === 'partial_today',
  ).length;
}
