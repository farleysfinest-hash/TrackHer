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
import type { Medication } from '../types/database';

async function loadActiveMedications(userId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('id, medication_name, frequency, frequency_details, is_active')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error || !data) return [];
  return data as Medication[];
}

export async function resyncRemindersForCurrentUser(): Promise<number> {
  const { user, profile } = useAuthStore.getState();
  if (!user?.id || !isNativeNotificationsAvailable()) return 0;
  const permission = await getReminderPermissionState();
  const medications = await loadActiveMedications(user.id);
  return syncLocalReminders({
    profile,
    medications,
    prefs: getReminderPrefs(),
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
    return () => {
      window.removeEventListener('trackher:account-reset', onChange);
      window.removeEventListener('trackher:medications-changed', onChange);
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
