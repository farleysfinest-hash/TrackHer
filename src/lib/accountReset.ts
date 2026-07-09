import { supabase } from './supabase';
import type { ProfileUpdate } from '../types/database';

export const PROFILE_RESET_FIELDS: ProfileUpdate = {
  onboarding_completed: false,
  welcome_seen: false,
  straw_stage: null,
  straw_stage_label: null,
  menopause_cause: null,
  periods_status: null,
  period_changes: null,
  last_period_timeframe: null,
  last_period_date: null,
  staging_completed_at: null,
  date_of_birth: null,
  has_uterus: true,
  checkin_frequency: null,
  menopause_stage: null,
};

const LOCAL_STORAGE_KEYS = [
  'trackher_welcome_dismissed',
  'trackher_first_checkin_done',
  'trackher_full_dashboard_seen',
  'predicther_instrument_tooltip_dismissed',
] as const;

export function clearTrackHerLocalStorage(): void {
  for (const key of LOCAL_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

/** Delete all user-owned app data and reset profile staging/onboarding fields. */
export async function deleteUserAppData(userId: string): Promise<{ success: boolean; error?: string }> {
  await supabase.from('quick_log_events').delete().eq('user_id', userId);
  await supabase.from('extended_symptom_logs').delete().eq('user_id', userId);
  await supabase.from('assessment_results').delete().eq('user_id', userId);
  await supabase.from('symptom_checkins').delete().eq('user_id', userId);
  await supabase.from('user_symptom_selections').delete().eq('user_id', userId);
  await supabase.from('dose_logs').delete().eq('user_id', userId);
  await supabase.from('medication_changes').delete().eq('user_id', userId);
  await supabase.from('medications').delete().eq('user_id', userId);
  await supabase.from('lab_results').delete().eq('user_id', userId);
  await supabase.from('ai_insights').delete().eq('user_id', userId);
  await supabase.from('reminder_schedule').delete().eq('user_id', userId);
  await supabase.from('dismissed_insights').delete().eq('user_id', userId);

  const { error } = await supabase
    .from('profiles')
    .update(PROFILE_RESET_FIELDS)
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  clearTrackHerLocalStorage();
  return { success: true };
}
