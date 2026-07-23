import { getUiValue, setUiValues } from './uiState';

export const REMINDER_UI_KEYS = {
  checkinEnabled: 'reminders_checkin_enabled',
  medsEnabled: 'reminders_meds_enabled',
  checkinTime: 'reminders_checkin_time',
  asked: 'reminders_permission_asked',
} as const;

export interface ReminderPrefs {
  checkinEnabled: boolean;
  medsEnabled: boolean;
  /** HH:mm local time for weekly check-in reminder. */
  checkinTime: string;
  asked: boolean;
}

const DEFAULT_CHECKIN_TIME = '18:00';

function parseBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function parseTime(value: unknown): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return value;
  return DEFAULT_CHECKIN_TIME;
}

export function getReminderPrefs(): ReminderPrefs {
  return {
    checkinEnabled: parseBool(getUiValue(REMINDER_UI_KEYS.checkinEnabled), true),
    medsEnabled: parseBool(getUiValue(REMINDER_UI_KEYS.medsEnabled), true),
    checkinTime: parseTime(getUiValue(REMINDER_UI_KEYS.checkinTime)),
    asked: parseBool(getUiValue(REMINDER_UI_KEYS.asked), false),
  };
}

export function setReminderPrefs(patch: Partial<ReminderPrefs>): ReminderPrefs {
  const next = { ...getReminderPrefs(), ...patch };
  setUiValues({
    [REMINDER_UI_KEYS.checkinEnabled]: next.checkinEnabled,
    [REMINDER_UI_KEYS.medsEnabled]: next.medsEnabled,
    [REMINDER_UI_KEYS.checkinTime]: next.checkinTime,
    [REMINDER_UI_KEYS.asked]: next.asked,
  });
  return next;
}

export function parseCheckinTime(time: string): { hour: number; minute: number } {
  const [h, m] = parseTime(time).split(':').map(Number);
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 18,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}
