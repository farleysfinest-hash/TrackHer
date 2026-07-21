import { describe, expect, it } from 'vitest';
import { Weekday } from '@capacitor/local-notifications';
import {
  CHECKIN_NOTIFICATION_ID,
  medicationNotificationId,
  timeOfDayToHour,
  toCapacitorWeekday,
} from '../localNotifications';
import { buildReminderNotifications } from '../reminderSync';
import { parseCheckinTime } from '../reminderPrefs';
import { hasProAccess, isSubscriptionsConfigured, PRO_ENTITLEMENT_ID } from '../subscriptions';

describe('local notification helpers', () => {
  it('maps JS getDay() to Capacitor Weekday', () => {
    expect(toCapacitorWeekday(0)).toBe(Weekday.Sunday);
    expect(toCapacitorWeekday(1)).toBe(Weekday.Monday);
    expect(toCapacitorWeekday(6)).toBe(Weekday.Saturday);
  });

  it('maps time_of_day labels to hours', () => {
    expect(timeOfDayToHour('morning')).toBe(8);
    expect(timeOfDayToHour('bedtime')).toBe(21);
    expect(timeOfDayToHour(undefined)).toBe(9);
  });

  it('parses check-in HH:mm', () => {
    expect(parseCheckinTime('14:30')).toEqual({ hour: 14, minute: 30 });
    expect(parseCheckinTime('bad')).toEqual({ hour: 9, minute: 0 });
  });

  it('builds stable medication notification ids', () => {
    const a = medicationNotificationId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 0);
    const b = medicationNotificationId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 0);
    const c = medicationNotificationId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 1);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBeGreaterThanOrEqual(2000);
    expect(a).toBeLessThan(3000);
  });
});

describe('buildReminderNotifications', () => {
  it('schedules weekly check-in when enabled and day is set', () => {
    const notifications = buildReminderNotifications({
      profile: { checkin_day: 1 },
      medications: [],
      prefs: {
        checkinEnabled: true,
        medsEnabled: false,
        checkinTime: '09:15',
        asked: true,
      },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe(CHECKIN_NOTIFICATION_ID);
    expect(notifications[0].schedule?.on?.weekday).toBe(Weekday.Monday);
    expect(notifications[0].schedule?.on?.hour).toBe(9);
    expect(notifications[0].schedule?.on?.minute).toBe(15);
  });

  it('schedules daily and twice-daily medication reminders', () => {
    const notifications = buildReminderNotifications({
      profile: { checkin_day: null },
      medications: [
        {
          id: 'med-daily',
          medication_name: 'Estradiol gel',
          frequency: 'daily',
          frequency_details: { time_of_day: 'morning' },
          is_active: true,
        },
        {
          id: 'med-twice',
          medication_name: 'Progesterone',
          frequency: 'twice_daily',
          frequency_details: null,
          is_active: true,
        },
        {
          id: 'med-prn',
          medication_name: 'As needed',
          frequency: 'as_needed',
          frequency_details: null,
          is_active: true,
        },
      ],
      prefs: {
        checkinEnabled: false,
        medsEnabled: true,
        checkinTime: '09:00',
        asked: true,
      },
    });

    expect(notifications).toHaveLength(3);
    expect(notifications.some((n) => n.body?.includes('Estradiol gel'))).toBe(true);
    expect(notifications.filter((n) => n.body?.includes('Progesterone'))).toHaveLength(2);
  });

  it('skips inactive medications', () => {
    const notifications = buildReminderNotifications({
      profile: null,
      medications: [
        {
          id: 'inactive',
          medication_name: 'Old patch',
          frequency: 'weekly',
          frequency_details: null,
          is_active: false,
        },
      ],
      prefs: {
        checkinEnabled: false,
        medsEnabled: true,
        checkinTime: '09:00',
        asked: true,
      },
    });
    expect(notifications).toHaveLength(0);
  });
});

describe('subscriptions scaffold', () => {
  it('exposes the pro entitlement id', () => {
    expect(PRO_ENTITLEMENT_ID).toBe('pro');
  });

  it('keeps Pro unlocked when RevenueCat is not configured', () => {
    expect(isSubscriptionsConfigured()).toBe(false);
    expect(hasProAccess()).toBe(true);
  });
});
