import {
  classifyCrisisTier,
  classifyCompanionShape,
  isClearlyNegatedClinicianRiskReport,
  looksRiskAdjacent,
  stripNegatedClinicianRiskReport,
} from './companionScripts.ts';

export type StoredCrisisTier =
  | 'mental_decline'
  | 'crisis'
  | 'crisis_imminent'
  | 'loved_one';

export type StoredCrisisState = {
  user_id: string;
  tier: StoredCrisisTier;
  response_count: number;
  presented_actions: string[];
  asked_questions: string[];
  escalated: boolean;
  last_activity_at: string;
  expires_at: string;
};

const APPROVED_CRISIS_QUESTIONS: Array<{
  id: string;
  tiers: StoredCrisisTier[];
  text: string;
}> = [
  {
    id: 'immediate_danger',
    tiers: ['crisis', 'crisis_imminent'],
    text: 'Are you in immediate danger right now?',
  },
  {
    id: 'alone_now',
    tiers: ['crisis', 'crisis_imminent'],
    text: 'Are you by yourself right now?',
  },
  {
    id: 'create_distance',
    tiers: ['crisis_imminent'],
    text: 'Can you put some distance between yourself and anything you could use to hurt yourself?',
  },
  {
    id: 'trusted_person',
    tiers: ['crisis', 'crisis_imminent'],
    text: 'Is there someone you can call or text right now if you need them?',
  },
  {
    id: 'connected',
    tiers: ['crisis', 'crisis_imminent'],
    text: 'Have you been able to reach anyone yet?',
  },
  {
    id: 'loved_one_nearby',
    tiers: ['loved_one'],
    text: 'Is the person you are worried about with someone safe right now?',
  },
  {
    id: 'loved_one_help',
    tiers: ['loved_one'],
    text: 'Has someone contacted trained crisis or emergency support for them?',
  },
];

export function crisisRank(tier: StoredCrisisTier): number {
  if (tier === 'crisis_imminent') return 4;
  if (tier === 'crisis') return 3;
  if (tier === 'loved_one') return 2;
  return 1;
}

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

const LOVED_ONE_RESOLUTION_PATTERNS = [
  /\b(?:they|he|she) (?:are|is|'re|'s) safe now\b/i,
  /\b(?:they|he|she) (?:got|received) emergency help\b/i,
  /\b(?:they|he|she) (?:are|is|'re|'s) at (?:the )?hospital\b/i,
  /\ba crisis counselor is with (?:them|him|her)\b/i,
];

function withoutResolutionLanguage(message: string): string {
  return [...RESOLUTION_PATTERNS, ...SOFT_DISMISS_PATTERNS].reduce(
    (current, pattern) => current.replace(new RegExp(pattern.source, 'gi'), ' '),
    message,
  );
}

/** Explicit first-person evidence that an active crisis may be ready to resolve. */
export function hasExplicitCrisisResolution(message: string): boolean {
  return (
    RESOLUTION_PATTERNS.some((pattern) => pattern.test(message)) ||
    SOFT_DISMISS_PATTERNS.some((pattern) => pattern.test(message))
  );
}

/** She asked to stop the safety follow-ups without affirming she is safe. */
export function hasSoftCrisisDismiss(message: string): boolean {
  return SOFT_DISMISS_PATTERNS.some((pattern) => pattern.test(message));
}

/** Explicit evidence that the other person in a loved-one crisis is now safe or supported. */
export function hasLovedOneCrisisResolution(message: string): boolean {
  return LOVED_ONE_RESOLUTION_PATTERNS.some((pattern) => pattern.test(message));
}

function hasResolutionForTier(message: string, tier: StoredCrisisTier): boolean {
  return tier === 'loved_one'
    ? hasLovedOneCrisisResolution(message)
    : hasExplicitCrisisResolution(message);
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
 * Used by `indicatesCrisisResolution` to enforce the precedence rule:
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
  const normalized = currentDanger.toLowerCase();
  if (
    /\b(gun|rifle|pistol|firearm|hang|hanging|overdose|jump off|slit|bleed out|knife)\b/.test(
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
    /\b(?:(?:don'?t|do not) plan on making it through (?:the )?night|(?:don'?t|do not) think i(?:'ll| will| am going to) be (?:alive|around|here) tomorrow)\b/.test(
      normalized,
    );
  if (passiveRisk && !benignAbsenceContext) return true;

  return false;
}

export function indicatesCrisisResolution(message: string): boolean {
  // Precedence rule: current danger wins over apparent resolution.
  // This is the structural guarantee — if the message contains ANY crisis signal,
  // resolution is impossible regardless of how much "I'm safe" wording is present.
  if (currentMessageHasCrisisSignal(message)) return false;

  return hasExplicitCrisisResolution(message);
}

export type RiskClassificationResult =
  | { status: 'ok'; tier: StoredCrisisTier | null }
  | { status: 'unavailable' };

export type CrisisTurnDecision =
  | { action: 'crisis'; tier: StoredCrisisTier }
  | { action: 'resolve' }
  | { action: 'classifier_unavailable' }
  | { action: 'risk_watch' }
  | { action: 'normal' };

/**
 * Pure crisis-state transition used by chat and non-chat free-text surfaces.
 * The caller supplies the model classification, keeping the safety decision testable
 * without allowing the model to author crisis copy.
 */
export function decideCrisisTurn(input: {
  message: string;
  priorTier: StoredCrisisTier | null;
  classification: RiskClassificationResult | null;
}): CrisisTurnDecision {
  const deterministicTier = deterministicCurrentCrisisTier(input.message);
  if (deterministicTier) return { action: 'crisis', tier: deterministicTier };

  // Soft dismiss of an active crisis: she asked to stop the safety follow-ups.
  // Honor that even if the classifier misreads "stop asking" / "leave me alone"
  // as continued ideation — unless the same message still contains current danger.
  if (
    input.priorTier &&
    hasSoftCrisisDismiss(input.message) &&
    !currentMessageHasCrisisSignal(input.message)
  ) {
    return { action: 'resolve' };
  }

  if (input.classification?.status === 'ok' && input.classification.tier) {
    return { action: 'crisis', tier: input.classification.tier };
  }

  if (input.priorTier) {
    if (
      hasResolutionForTier(input.message, input.priorTier) &&
      !currentMessageHasCrisisSignal(input.message) &&
      input.classification?.status === 'ok' &&
      input.classification.tier === null
    ) {
      return { action: 'resolve' };
    }
    // mental_decline is the lightest tier — don't persist it across follow-ups.
    // It fires once, delivers its script, then conversation returns to normal.
    // If she says something crisis-worthy again, the classifier catches it fresh.
    // crisis / crisis_imminent / loved_one still persist for safety.
    if (input.priorTier === 'mental_decline') {
      return { action: 'normal' };
    }
    return { action: 'crisis', tier: input.priorTier };
  }

  if (
    input.classification?.status === 'unavailable' &&
    (currentMessageHasCrisisSignal(input.message) || looksRiskAdjacent(input.message))
  ) {
    return { action: 'classifier_unavailable' };
  }

  if (currentMessageHasCrisisSignal(input.message)) {
    return { action: 'classifier_unavailable' };
  }

  // Middle tier: risk-adjacent trip words fired but the classifier confidently
  // judged the message non-crisis. Proceed with ordinary chat, carrying the
  // signal forward so the reply can acknowledge it instead of discarding it.
  if (
    input.classification?.status === 'ok' &&
    input.classification.tier === null &&
    looksRiskAdjacent(input.message)
  ) {
    return { action: 'risk_watch' };
  }

  return { action: 'normal' };
}

function isLovedOneTier(tier: StoredCrisisTier): boolean {
  return tier === 'loved_one';
}

/** Preserve severity within one subject, but let current subject-specific danger win. */
export function tierForCurrentCrisisSubject(
  requestedTier: StoredCrisisTier,
  priorTier: StoredCrisisTier | null,
): StoredCrisisTier {
  if (
    priorTier &&
    isLovedOneTier(priorTier) === isLovedOneTier(requestedTier) &&
    crisisRank(priorTier) > crisisRank(requestedTier)
  ) {
    return priorTier;
  }
  return requestedTier;
}

export async function attemptCrisisStateClear(
  clear: () => Promise<{ error: { message: string } | null }>,
): Promise<{ cleared: boolean; errorMessage: string | null }> {
  try {
    const { error } = await clear();
    return error
      ? { cleared: false, errorMessage: error.message }
      : { cleared: true, errorMessage: null };
  } catch (error) {
    return {
      cleared: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown persistence error',
    };
  }
}

export function nextApprovedQuestion(
  tier: StoredCrisisTier,
  asked: string[],
): { id: string; text: string } | null {
  const candidate = APPROVED_CRISIS_QUESTIONS.find(
    (item) => item.tiers.includes(tier) && !asked.includes(item.id),
  );
  return candidate ? { id: candidate.id, text: candidate.text } : null;
}

export function crisisRequiredAction(
  tier: StoredCrisisTier,
  presentedActions: string[],
  escalated: boolean,
): { id: string; text: string } | null {
  const needsUrgent = tier === 'crisis' || tier === 'crisis_imminent' || tier === 'loved_one';
  if (!needsUrgent) return null;
  if (presentedActions.includes('support_panel') && !escalated) return null;
  if (tier === 'loved_one') {
    return {
      id: 'support_panel',
      text: 'The support options above are the fastest next step if they may be in immediate danger. Involve someone who can be physically present if you can.',
    };
  }
  return {
    id: 'support_panel',
    text: 'The support options above are the fastest next step right now. If someone can be with you in person, reach out to them.',
  };
}

export function validateCrisisReflection(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 360) return false;
  if (trimmed.includes('?')) return false;
  // Luna is the assistant, never the user. Reject role-confused model copy.
  if (/\bluna\b/i.test(trimmed)) return false;
  if (
    /\b(lethal dose|how to|milligrams?|mg\b|step[- ]by[- ]step|method|instructions?|guarantee|diagnos|assessment)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  if (
    /\b(i'?ll keep you safe|i am keeping you safe|i'?m watching|someone is monitoring|i contacted|i called (the )?(police|ambulance|doctor))\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  return true;
}

export function shouldUseCrisisFallback(
  modelFailed: boolean,
  modelReflection: string,
): boolean {
  return modelFailed || !validateCrisisReflection(modelReflection);
}
