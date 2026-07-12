/**
 * Check-in drafts are held in localStorage, unencrypted, on the user's device.
 * They are cleared on submit, on discard, on sign-out, and on account reset,
 * and expire after 7 days. This is a deliberate trade: losing a completed
 * 11-item MRS is a certainty today, device-level exposure is a possibility.
 * Revisit when the data-portability / consent work lands.
 */
import type { MRSScoresMap } from '../utils/checkinHelpers';
import type { ExtendedSymptomEntry } from '../stores/checkinStore';

export const CHECKIN_DRAFT_KEY = 'trackher_checkin_draft';

/** Drafts older than this are discarded on load, never offered. */
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CheckinDraft {
  /** Schema version. Bump if the shape changes; mismatched versions are discarded. */
  v: 1;
  userId: string;
  targetDate: string;
  mode: 'full' | 'quick';
  savedAt: string;
  currentStep: number;
  instrumentId: string;
  energyLevel: number | null;
  moodLevel: number | null;
  sleepQuality: number | null;
  energyComplete: boolean;
  moodComplete: boolean;
  sleepComplete: boolean;
  flareSelected: string[];
  flarePreLogged: string[];
  mrsScores: MRSScoresMap;
  extendedSymptoms: ExtendedSymptomEntry[];
  pendingKeepWatch: string[];
  notes: string;
}

export function saveCheckinDraft(draft: CheckinDraft): void {
  try {
    localStorage.setItem(CHECKIN_DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    console.warn('Failed to save check-in draft:', e);
  }
}

export function loadCheckinDraft(
  userId: string,
  targetDate: string,
  mode: 'full' | 'quick',
): CheckinDraft | null {
  try {
    const raw = localStorage.getItem(CHECKIN_DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as CheckinDraft;

    if (
      draft.v !== 1 ||
      draft.userId !== userId ||
      draft.targetDate !== targetDate ||
      draft.mode !== mode ||
      Date.now() - new Date(draft.savedAt).getTime() >= DRAFT_MAX_AGE_MS
    ) {
      return null;
    }

    return draft;
  } catch {
    clearCheckinDraft();
    return null;
  }
}

export function clearCheckinDraft(): void {
  try {
    localStorage.removeItem(CHECKIN_DRAFT_KEY);
  } catch {
    // cleanup failure is not worth interrupting her
  }
}
