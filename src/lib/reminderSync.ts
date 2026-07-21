import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import { Weekday } from '@capacitor/local-notifications';
import type { Medication, Profile } from '../types/database';
import {
  buildCheckinNotification,
  buildDailyMedicationNotification,
  buildWeeklyMedicationNotification,
  medicationNotificationId,
  scheduleReminders,
  timeOfDayToHour,
} from './localNotifications';
import { getReminderPrefs, parseCheckinTime, type ReminderPrefs } from './reminderPrefs';

/** Frequencies we can reliably schedule as daily clock reminders. */
const DAILY_FREQUENCIES = new Set([
  'daily',
  'twice_daily',
  'three_times_daily',
]);

/** Frequencies we schedule as a weekly weekday reminder (patch change day). */
const WEEKLY_FREQUENCIES = new Set(['weekly']);

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

/**
 * Build the local notification list from profile + active medications + prefs.
 * Pure — safe to unit test without Capacitor.
 */
export function buildReminderNotifications(opts: {
  profile: Pick<Profile, 'checkin_day'> | null;
  medications: Pick<Medication, 'id' | 'medication_name' | 'frequency' | 'frequency_details' | 'is_active'>[];
  prefs?: ReminderPrefs;
}): LocalNotificationSchema[] {
  const prefs = opts.prefs ?? getReminderPrefs();
  const notifications: LocalNotificationSchema[] = [];

  if (prefs.checkinEnabled && opts.profile?.checkin_day != null) {
    const { hour, minute } = parseCheckinTime(prefs.checkinTime);
    notifications.push(
      buildCheckinNotification({
        checkinDay: opts.profile.checkin_day,
        hour,
        minute,
      }),
    );
  }

  if (!prefs.medsEnabled) return notifications;

  for (const med of opts.medications) {
    if (!med.is_active) continue;
    if (med.frequency === 'as_needed' || med.frequency === 'custom') continue;

    const timeOfDay =
      typeof med.frequency_details?.time_of_day === 'string'
        ? med.frequency_details.time_of_day
        : undefined;

    if (DAILY_FREQUENCIES.has(med.frequency)) {
      const hours = hoursForFrequency(med.frequency, timeOfDay);
      hours.forEach((hour, slot) => {
        notifications.push(
          buildDailyMedicationNotification({
            id: medicationNotificationId(med.id, slot),
            medicationName: med.medication_name,
            hour,
          }),
        );
      });
      continue;
    }

    if (WEEKLY_FREQUENCIES.has(med.frequency)) {
      // Default patch-change reminder to Monday morning unless time_of_day says otherwise.
      notifications.push(
        buildWeeklyMedicationNotification({
          id: medicationNotificationId(med.id, 0),
          medicationName: med.medication_name,
          weekday: Weekday.Monday,
          hour: timeOfDayToHour(timeOfDay),
        }),
      );
    }
  }

  return notifications;
}

/** Cancel pending locals and reschedule from current prefs + data. */
export async function syncLocalReminders(opts: {
  profile: Pick<Profile, 'checkin_day'> | null;
  medications: Pick<Medication, 'id' | 'medication_name' | 'frequency' | 'frequency_details' | 'is_active'>[];
  prefs?: ReminderPrefs;
  permissionGranted: boolean;
}): Promise<number> {
  if (!opts.permissionGranted) {
    await scheduleReminders([]);
    return 0;
  }
  const notifications = buildReminderNotifications(opts);
  await scheduleReminders(notifications);
  return notifications.length;
}
