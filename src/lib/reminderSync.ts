import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Medication, MedicationAdministration, Profile } from '../types/database';
import {
  buildCheckinNotification,
  buildMedicationDoseNotification,
  medicationNotificationId,
  nextCheckinReminderAt,
  nextDoseReminderAt,
  scheduleReminders,
  timeOfDayToHour,
} from './localNotifications';
import { getReminderPrefs, parseCheckinTime, type ReminderPrefs } from './reminderPrefs';
import { getLocalDateISO } from '../utils/checkinHelpers';
import { getDoseStatus, isDoseLoggable } from '../utils/doseSchedule';

/** Frequencies we schedule as daily clock slot reminders. */
const DAILY_FREQUENCIES = new Set([
  'daily',
  'twice_daily',
  'three_times_daily',
]);

/** Frequencies we schedule once on due days (weekly / interval). */
const INTERVAL_FREQUENCIES = new Set([
  'weekly',
  'every_other_day',
  'every_two_weeks',
  'every_three_weeks',
  'every_four_weeks',
]);

function hoursForFrequency(
  frequency: Medication['frequency'],
  timeOfDay: string | undefined,
): number[] {
  const primary = timeOfDayToHour(timeOfDay);
  if (frequency === 'twice_daily') {
    return [8, 20];
  }
  if (frequency === 'three_times_daily') {
    return [8, 14, 20];
  }
  return [primary];
}

export interface BuildReminderNotificationsOpts {
  profile: Pick<Profile, 'checkin_day' | 'timezone'> | null;
  medications: Pick<
    Medication,
    | 'id'
    | 'medication_name'
    | 'frequency'
    | 'frequency_details'
    | 'is_active'
    | 'delivery_method'
    | 'start_date'
    | 'end_date'
  >[];
  /** Recent administrations — used to skip dose nags when already logged. */
  administrations?: MedicationAdministration[];
  prefs?: ReminderPrefs;
  /** Whether this week's MRS minimum is already met. */
  weeklyDone?: boolean;
  /** Override clock for tests. */
  now?: Date;
  /** Override local ISO date for dose status (tests). */
  today?: string;
  timezone?: string;
}

/**
 * Build the local notification list from profile + active medications + prefs.
 * Pure — safe to unit test without Capacitor.
 *
 * Check-in and med dose reminders are both one-shots that skip when the owed
 * action is already done (MRS this week / dose slot today).
 */
export function buildReminderNotifications(
  opts: BuildReminderNotificationsOpts,
): LocalNotificationSchema[] {
  const prefs = opts.prefs ?? getReminderPrefs();
  const notifications: LocalNotificationSchema[] = [];
  const weeklyDone = opts.weeklyDone ?? false;
  const now = opts.now ?? new Date();
  const timezone = opts.timezone ?? opts.profile?.timezone ?? undefined;
  const today = opts.today ?? getLocalDateISO(timezone);
  const administrations = opts.administrations ?? [];

  if (prefs.checkinEnabled && opts.profile?.checkin_day != null) {
    const { hour, minute } = parseCheckinTime(prefs.checkinTime);
    const at = nextCheckinReminderAt({
      checkinDay: opts.profile.checkin_day,
      hour,
      minute,
      weeklyDone,
      now,
    });
    notifications.push(buildCheckinNotification({ at }));
  }

  if (!prefs.medsEnabled) return notifications;

  for (const med of opts.medications) {
    if (!med.is_active) continue;
    if (med.frequency === 'as_needed' || med.frequency === 'custom') continue;
    if (!isDoseLoggable(med as Medication, today)) continue;

    const timeOfDay =
      typeof med.frequency_details?.time_of_day === 'string'
        ? med.frequency_details.time_of_day
        : undefined;

    const status = getDoseStatus(
      med as Medication,
      administrations,
      today,
      timezone,
    );

    // Fully satisfied for this period — still schedule the next due day so she
    // is nudged again when the next dose window opens.
    if (status.state === 'on_demand') continue;

    if (DAILY_FREQUENCIES.has(med.frequency)) {
      const hours = hoursForFrequency(med.frequency, timeOfDay);
      hours.forEach((hour, slot) => {
        const slotDone = status.takenToday > slot;
        const at = nextDoseReminderAt({ hour, minute: 0, done: slotDone, now });
        notifications.push(
          buildMedicationDoseNotification({
            id: medicationNotificationId(med.id, slot),
            medicationName: med.medication_name,
            at,
          }),
        );
      });
      continue;
    }

    if (INTERVAL_FREQUENCIES.has(med.frequency) || status.nextDueDate) {
      const hour = timeOfDayToHour(timeOfDay);
      const dueToday =
        status.state === 'due_today' || status.state === 'partial_today';
      const doneToday = status.satisfied;

      if (dueToday) {
        const at = nextDoseReminderAt({ hour, minute: 0, done: doneToday, now });
        notifications.push(
          buildMedicationDoseNotification({
            id: medicationNotificationId(med.id, 0),
            medicationName: med.medication_name,
            at,
          }),
        );
      } else if (status.nextDueDate) {
        const [y, m, d] = status.nextDueDate.split('-').map(Number);
        const at = new Date(y, m - 1, d, hour, 0, 0, 0);
        if (at.getTime() > now.getTime()) {
          notifications.push(
            buildMedicationDoseNotification({
              id: medicationNotificationId(med.id, 0),
              medicationName: med.medication_name,
              at,
            }),
          );
        }
      }
    }
  }

  return notifications;
}

/** Cancel pending locals and reschedule from current prefs + data. */
export async function syncLocalReminders(
  opts: BuildReminderNotificationsOpts & { permissionGranted: boolean },
): Promise<number> {
  if (!opts.permissionGranted) {
    await scheduleReminders([]);
    return 0;
  }
  const notifications = buildReminderNotifications(opts);
  await scheduleReminders(notifications);
  return notifications.length;
}
