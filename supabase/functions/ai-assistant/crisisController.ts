import {
  classifyCrisisTier,
  classifyCompanionShape,
  isClearlyNegatedClinicianRiskReport,
  stripNegatedClinicianRiskReport,
} from './companionScripts.ts';

/**
 * DB CHECK constraint still allows 'mental_decline' (migration 034) but the
 * app no longer writes it. Legacy rows are cleaned on read. Keep the literal
 * so TypeScript doesn't reject rows that haven't been cleaned yet.
 */
export type StoredCrisisTier =
  | 'mental_decline'
  | 'crisis'
  | 'crisis_imminent'
  | 'loved_one';

const RESOLUTION_PATTERNS = [
  /\b(?:i am|i'?m) safe now\b/i,
  /\b(?:(?:i am|i'?m) )?not going to (?:hurt|kill) myself\b/i,
  /\bi no longer (?:want to )?(?:hurt|kill) myself\b/i,
  /\b(?:i am )?no longer going to (?:act|hurt myself|kill myself)\b/i,
  /\bi got emergency help\b/i,
  /\b(?:i am|i'?m) at (?:the )?hospital\b/i,
  /\ba crisis counselor is with me\b/i,
];

/** She wants the safety follow-ups to stop — not the same as affirming safety. */
const SOFT_DISMISS_PATTERNS = [
  /\b(?:i )?(?:don'?t|do not) want (?:your |this |the )?(?:help|support|resources)\b/i,
  /\b(?:i )?(?:don'?t|do not) want (?:the )?(?:crisis|safety|988|hotline) (?:help|support|stuff|resources|questions?|panel|lecture)?\b/i,
  /\b(?:please )?stop (?:asking|bugging|nagging)(?: me)?\b/i,
  /\b(?:please )?stop with the (?:safety|crisis|support|988|questions?)\b/i,
  /\bleave me alone\b/i,
  /\benough (?:with )?(?:the )?(?:safety|crisis|988|hotline|support prompts?)\b/i,
];

function withoutResolutionLanguage(message: string): string {
  return [...RESOLUTION_PATTERNS, ...SOFT_DISMISS_PATTERNS].reduce(
    (current, pattern) => current.replace(new RegExp(pattern.source, 'gi'), ' '),
    message,
  );
}

/**
 * Deterministic tier for current danger only. Resolution language is removed before
 * classification so "not going to hurt myself" is not re-read as an affirmative threat,
 * while a conflicting clause after "but" remains available to the classifiers.
 */
export function deterministicCurrentCrisisTier(
  message: string,
): StoredCrisisTier | null {
  const currentDanger = withoutResolutionLanguage(message);
  if (classifyCompanionShape(currentDanger) === 'loved_one_crisis') return 'loved_one';
  return classifyCrisisTier(currentDanger);
}

/**
 * Deterministic check: does the current message contain ANY crisis or danger signal?
 *
 * Used by the Edge handler to tag crisis turns and enforce the precedence rule:
 * current danger always wins over apparent resolution wording.
 * A message like "I'm safe now, but I'm going to do it tonight" must NOT resolve
 * because this function catches the imminent danger first.
 */
export function currentMessageHasCrisisSignal(message: string): boolean {
  // Strip negated clinician SI screens first so "doctor asked… I said no, adjusting dose"
  // does not trip on the screening words, while "…said no, but I want to die" still does.
  const afterNegatedScreen = stripNegatedClinicianRiskReport(message);
  if (!afterNegatedScreen || isClearlyNegatedClinicianRiskReport(message)) return false;
  const currentDanger = withoutResolutionLanguage(afterNegatedScreen);

  // The authoritative regex classifiers detect self-harm tiers.
  if (classifyCrisisTier(currentDanger)) return true;

  // Loved-one danger is also a crisis signal.
  if (classifyCompanionShape(currentDanger) === 'loved_one_crisis') return true;

  // Catch method mentions and continued-danger phrasing that the tier classifier
  // alone might not fire on (e.g. embedded "but I have a gun" after resolution text).
  // Bare "hanging" / "overdose" are excluded — common HRT/casual false positives;
  // they still fire via classifyCrisisTier when paired with ideation or dose-seeking.
  const normalized = currentDanger.toLowerCase();
  if (
    /\b(gun|rifle|pistol|firearm|hang myself|jump off|slit|bleed out|knife)\b/.test(
      normalized,
    )
  ) {
    return true;
  }
  if (
    /\b(not safe|still (want|going|planning)|still suicidal|still going to|haven'?t gotten help)\b/.test(
      normalized,
    )
  ) {
    return true;
  }
  if (
    /\b(hurt myself|cut myself|cutting myself|hurt (her|him|them)self|kill myself|end (my|it))\b/.test(
      normalized,
    )
  ) {
    return true;
  }

  const benignAbsenceContext =
    /\b(travel|travelling|traveling|appointment|flight|vacation|out of town|work trip|school trip)\b/.test(
      normalized,
    );
  const passiveRisk =
    /\b(?:(?:don'?t|do not) plan on making it through (?:the )?night|(?:don'?t|do not) think i(?:'ll|'?m going to| will| am going to) be (?:alive|around|here) tomorrow)\b/.test(
      normalized,
    );
  if (passiveRisk && !benignAbsenceContext) return true;

  return false;
}
