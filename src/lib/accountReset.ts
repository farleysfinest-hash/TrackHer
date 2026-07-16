import { clearEngineResultCache } from '../engine/insightCache';
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

/** Atomically erase every app-owned value while preserving only the authentication identity. */
export async function deleteUserAppData(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('reset_user_app_data');
  if (error) return { success: false, error: error.message };

  clearEngineResultCache();
  clearTrackHerLocalStorage();
  window.dispatchEvent(new CustomEvent('trackher:account-reset'));
  return { success: true };
}
