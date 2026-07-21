import { clearEngineResultCache } from '../engine/insightCache';
import { cancelAllReminders } from './localNotifications';
import { logOutSubscriber } from './subscriptions';
import { supabase } from './supabase';

const APP_STORAGE_PREFIXES = ['trackher_', 'predicther_'] as const;

export function clearTrackHerLocalStorage(): void {
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
  for (const key of keys) {
    if (key && APP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

async function clearClientSideSessionArtifacts(): Promise<void> {
  clearEngineResultCache();
  clearTrackHerLocalStorage();
  await cancelAllReminders();
}

/** Atomically erase every app-owned value while preserving only the authentication identity. */
export async function deleteUserAppData(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('reset_user_app_data');
  if (error) return { success: false, error: error.message };

  await clearClientSideSessionArtifacts();
  window.dispatchEvent(new CustomEvent('trackher:account-reset'));
  return { success: true };
}

/** Permanently delete the user's account, all app data, and their auth identity. */
export async function deleteUserAccount(): Promise<{ success: boolean; error?: string }> {
  // Detach RevenueCat identity before wiping the auth user when subscriptions are live.
  await logOutSubscriber();

  const { error } = await supabase.rpc('delete_user_account');
  if (error) return { success: false, error: error.message };

  await clearClientSideSessionArtifacts();

  // The auth.users row is gone, but the JWT is still valid until it expires.
  // Sign out locally so the client doesn't hold a zombie session.
  await supabase.auth.signOut({ scope: 'local' });

  window.dispatchEvent(new CustomEvent('trackher:account-deleted'));
  return { success: true };
}
