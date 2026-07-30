import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getReminderPermissionState,
  isNativeNotificationsAvailable,
  requestReminderPermission,
  type ReminderPermissionState,
} from '../lib/localNotifications';
import { getReminderPrefs, setReminderPrefs, type ReminderPrefs } from '../lib/reminderPrefs';
import { syncLocalReminders } from '../lib/reminderSync';
import { useAuthStore } from '../stores/authStore';
import { useCheckinStatusStore } from '../stores/checkinStatusStore';
import type { Medication, MedicationAdministration } from '../types/database';
import { DOSE_HISTORY_DAYS } from '../utils/doseSchedule';
import { fetchAllPages } from '../utils/pagedQuery';

async function loadActiveMedications(userId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select(
      'id, medication_name, frequency, frequency_details, is_active, delivery_method, start_date, end_date',
    )
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error || !data) return [];
  return data as Medication[];
}

async function loadRecentAdministrations(
  userId: string,
): Promise<MedicationAdministration[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DOSE_HISTORY_DAYS);
  const cutoffISO = cutoff.toISOString();
  try {
    return await fetchAllPages<MedicationAdministration>(async (from, to) => {
      const { data, error } = await supabase
        .from('medication_administrations')
        .select('*')
        .eq('user_id', userId)
        .gte('taken_at', cutoffISO)
        .order('taken_at', { ascending: false })
        .range(from, to);
      return { data: data as MedicationAdministration[] | null, error };
    });
  } catch {
    return [];
  }
}

export async function resyncRemindersForCurrentUser(): Promise<number> {
  const { user, profile } = useAuthStore.getState();
  if (!user?.id || !isNativeNotificationsAvailable()) return 0;
  const permission = await getReminderPermissionState();
  const [medications, administrations] = await Promise.all([
    loadActiveMedications(user.id),
    loadRecentAdministrations(user.id),
  ]);
  const weeklyDone = useCheckinStatusStore.getState().status.weeklyMinimumMet;
  return syncLocalReminders({
    profile,
    medications,
    administrations,
    prefs: getReminderPrefs(),
    weeklyDone,
    timezone: profile?.timezone ?? undefined,
    permissionGranted: permission === 'granted',
  });
}

/**
 * Background sync for AppShell. Keeps local notifications aligned after
 * profile / medication changes. No-ops on web.
 */
export function useReminderSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const checkinDay = useAuthStore((s) => s.profile?.checkin_day);

  useEffect(() => {
    if (!userId) return;
    void resyncRemindersForCurrentUser();
  }, [userId, checkinDay]);

  useEffect(() => {
    const onChange = () => {
      void resyncRemindersForCurrentUser();
    };
    window.addEventListener('trackher:account-reset', onChange);
    window.addEventListener('trackher:medications-changed', onChange);
    window.addEventListener('trackher:doses-changed', onChange);
    return () => {
      window.removeEventListener('trackher:account-reset', onChange);
      window.removeEventListener('trackher:medications-changed', onChange);
      window.removeEventListener('trackher:doses-changed', onChange);
    };
  }, []);
}

/** Settings / onboarding controls for reminder permission + prefs. */
export function useReminderSettings() {
  const [permission, setPermission] = useState<ReminderPermissionState>('unsupported');
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => getReminderPrefs());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPermission = useCallback(async () => {
    const state = await getReminderPermissionState();
    setPermission(state);
    return state;
  }, []);

  useEffect(() => {
    void refreshPermission();
    setPrefs(getReminderPrefs());
  }, [refreshPermission]);

  const enableReminders = useCallback(async () => {
    setIsSyncing(true);
    try {
      const state = await requestReminderPermission();
      setPermission(state);
      const next = setReminderPrefs({ asked: true, checkinEnabled: true, medsEnabled: true });
      setPrefs(next);
      if (state === 'granted') await resyncRemindersForCurrentUser();
      return state;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<ReminderPrefs>) => {
    setIsSyncing(true);
    try {
      const next = setReminderPrefs(patch);
      setPrefs(next);
      await resyncRemindersForCurrentUser();
      return next;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    available: isNativeNotificationsAvailable(),
    permission,
    prefs,
    isSyncing,
    enableReminders,
    updatePrefs,
    refreshPermission,
  };
}
