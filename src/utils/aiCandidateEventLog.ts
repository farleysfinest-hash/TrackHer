import { supabase } from '../lib/supabase';
import {
  hashAiCandidateTitle,
  type AiCandidateEventAction,
} from './aiCandidateTracker';

/** Fire-and-forget insert; never throws to callers. */
export function logAiCandidateEvent(
  userId: string,
  title: string,
  action: AiCandidateEventAction,
): void {
  const trimmed = title.trim();
  if (!userId || !trimmed) return;
  const candidate_hash = hashAiCandidateTitle(trimmed);
  void supabase
    .from('ai_candidate_events')
    .insert({
      user_id: userId,
      candidate_hash,
      title: trimmed.slice(0, 200),
      action,
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn('ai_candidate_events insert failed:', error.message);
      }
    });
}
