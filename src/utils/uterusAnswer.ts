import type { Profile } from '../types/database';

export type UterusAnswer = 'yes' | 'no' | 'unsure';

/**
 * null return means the question has never been answered.
 * A confirmed timestamp with has_uterus null means the user answered "I'm not sure" —
 * a fully legitimate answer, never to be collapsed into a guess.
 */
export function deriveUterusAnswer(
  profile: Pick<Profile, 'has_uterus' | 'has_uterus_confirmed_at'> | null | undefined,
): UterusAnswer | null {
  if (!profile?.has_uterus_confirmed_at) return null;
  if (profile.has_uterus === true) return 'yes';
  if (profile.has_uterus === false) return 'no';
  return 'unsure';
}

export function uterusAnswerToValue(answer: UterusAnswer): boolean | null {
  if (answer === 'yes') return true;
  if (answer === 'no') return false;
  return null;
}
