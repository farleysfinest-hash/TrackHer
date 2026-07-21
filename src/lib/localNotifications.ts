import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
  type PermissionStatus,
  Weekday,
} from '@capacitor/local-notifications';

/** Stable ID for the weekly check-in reminder. */
export const CHECKIN_NOTIFICATION_ID = 1000;

/** Medication reminder IDs occupy 2000–2999. */
const MED_NOTIFICATION_ID_BASE = 2000;

export type ReminderPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function isNativeNotificationsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/** Map profile checkin_day (0=Sun…6=Sat) to Capacitor Weekday (1=Sun…7=Sat). */
export function toCapacitorWeekday(checkinDay: number): Weekday {
  const clamped = ((checkinDay % 7) + 7) % 7;
  return (clamped + 1) as Weekday;
}

/** Map medication time_of_day labels to a clock hour (local). */
export function timeOfDayToHour(timeOfDay: string | undefined | null): number {
  switch (timeOfDay) {
    case 'morning':
      return 8;
    case 'with_meals':
      return 12;
    case 'evening':
      return 18;
    case 'bedtime':
      return 21;
    default:
      return 9;
  }
}

/** Stable 32-bit-ish positive id from a medication UUID. */
export function medicationNotificationId(medicationId: string, slot = 0): number {
  let hash = 0;
  for (let i = 0; i < medicationId.length; i++) {
    hash = (hash * 31 + medicationId.charCodeAt(i)) | 0;
  }
  const positive = Math.abs(hash) % 900;
  return MED_NOTIFICATION_ID_BASE + positive + slot * 10;
}

export async function getReminderPermissionState(): Promise<ReminderPermissionState> {
  if (!isNativeNotificationsAvailable()) return 'unsupported';
  try {
    const status: PermissionStatus = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return 'granted';
    if (status.display === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unsupported';
  }
}

export async function requestReminderPermission(): Promise<ReminderPermissionState> {
  if (!isNativeNotificationsAvailable()) return 'unsupported';
  try {
    const status = await LocalNotifications.requestPermissions();
    if (status.display === 'granted') return 'granted';
    if (status.display === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unsupported';
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!isNativeNotificationsAvailable()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length === 0) return;
    await LocalNotifications.cancel({ notifications: pending.notifications });
  } catch (err) {
    console.error('Failed to cancel reminders:', err);
  }
}

export async function scheduleReminders(notifications: LocalNotificationSchema[]): Promise<void> {
  if (!isNativeNotificationsAvailable()) return;
  await cancelAllReminders();
  if (notifications.length === 0) return;
  try {
    await LocalNotifications.schedule({ notifications });
  } catch (err) {
    console.error('Failed to schedule reminders:', err);
  }
}

export function buildCheckinNotification(opts: {
  checkinDay: number;
  hour: number;
  minute: number;
}): LocalNotificationSchema {
  return {
    id: CHECKIN_NOTIFICATION_ID,
    title: 'Weekly check-in',
    body: 'A few minutes now keeps your HRT timeline clear for your next appointment.',
    schedule: {
      on: {
        weekday: toCapacitorWeekday(opts.checkinDay),
        hour: opts.hour,
        minute: opts.minute,
      },
      repeats: true,
      allowWhileIdle: true,
    },
    extra: { path: '/checkin' },
  };
}

export function buildDailyMedicationNotification(opts: {
  id: number;
  medicationName: string;
  hour: number;
  minute?: number;
}): LocalNotificationSchema {
  return {
    id: opts.id,
    title: 'Dose reminder',
    body: `Time for ${opts.medicationName}.`,
    schedule: {
      on: {
        hour: opts.hour,
        minute: opts.minute ?? 0,
      },
      repeats: true,
      allowWhileIdle: true,
    },
    extra: { path: '/medications' },
  };
}

export function buildWeeklyMedicationNotification(opts: {
  id: number;
  medicationName: string;
  weekday: Weekday;
  hour: number;
  minute?: number;
}): LocalNotificationSchema {
  return {
    id: opts.id,
    title: 'Dose reminder',
    body: `Time for ${opts.medicationName}.`,
    schedule: {
      on: {
        weekday: opts.weekday,
        hour: opts.hour,
        minute: opts.minute ?? 0,
      },
      repeats: true,
      allowWhileIdle: true,
    },
    extra: { path: '/medications' },
  };
}
