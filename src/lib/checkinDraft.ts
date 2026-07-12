import { supabase } from './supabase';
import type { CheckinDraft, CheckinDraftPayload } from '../types/database';

export const CHECKIN_DRAFT_SCHEMA_VERSION = 1;

/** Drafts older than this are ignored and deleted, never offered. */
const DRAFT_MAX_AGE_DAYS = 7;
const DRAFT_MAX_AGE_MS = DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

function isDraftTooOld(updatedAt: string): boolean {
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(updated)) return true;
  return Date.now() - updated > DRAFT_MAX_AGE_MS;
}

export async function saveCheckinDraft(
  userId: string,
  targetDate: string,
  mode: 'full' | 'quick',
  payload: CheckinDraftPayload,
): Promise<boolean> {
  const { error } = await supabase.from('checkin_drafts').upsert(
    {
      user_id: userId,
      target_date: targetDate,
      mode,
      schema_version: CHECKIN_DRAFT_SCHEMA_VERSION,
      payload,
    },
    { onConflict: 'user_id,target_date,mode' },
  );
  return !error;
}

export async function loadCheckinDraft(
  userId: string,
  targetDate: string,
  mode: 'full' | 'quick',
): Promise<CheckinDraft | null> {
  const { data } = await supabase
    .from('checkin_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('target_date', targetDate)
    .eq('mode', mode)
    .maybeSingle();

  if (!data) return null;

  const draft = data as CheckinDraft;

  if (
    draft.schema_version !== CHECKIN_DRAFT_SCHEMA_VERSION ||
    isDraftTooOld(draft.updated_at)
  ) {
    await clearCheckinDraft(userId, targetDate, mode);
    return null;
  }

  return draft;
}

export async function clearCheckinDraft(
  userId: string,
  targetDate: string,
  mode: 'full' | 'quick',
): Promise<void> {
  try {
    await supabase
      .from('checkin_drafts')
      .delete()
      .eq('user_id', userId)
      .eq('target_date', targetDate)
      .eq('mode', mode);
  } catch {
    // cleanup failure is not worth interrupting her
  }
}
