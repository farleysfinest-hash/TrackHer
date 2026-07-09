/**
 * Derived STRAW+10 stage profile for copy and context surfaces.
 *
 * Population-typical symptom clusters are informed by STRAW+10 staging
 * (Harlow et al., 2012; PMC3340903). They describe what is commonly reported
 * at each stage — not individual predictions or diagnoses.
 */

import type { Profile } from '../types/database';
import {
  computeStagingResult,
  STAGE_DETAILS,
  type StagingAnswers,
  type StrawStageCode,
  type MenopauseCauseAnswer,
} from '../lib/strawStaging';

export type CanonicalStage =
  | 'LATE_REPRODUCTIVE'
  | 'EARLY_PERI'
  | 'LATE_PERI'
  | 'EARLY_POST'
  | 'LATE_POST'
  | 'SURGICAL'
  | 'IATROGENIC'
  | 'HYSTERECTOMY_OVARIES_INTACT';

export interface StageProfile {
  /** Canonical stage; null when staging answers are incomplete or unknown. */
  stage: CanonicalStage | null;
  label: string | null;
  description: string | null;
  /** Population-typical clusters at this stage — not diagnostic for the individual. */
  typicalSymptomClusters: string[];
}

export const UNKNOWN_STAGE_PROFILE: StageProfile = {
  stage: null,
  label: null,
  description: null,
  typicalSymptomClusters: [],
};

/**
 * Population-typical symptom clusters by canonical stage (STRAW+10; Harlow et al., PMC3340903).
 * Illustrative context only — individual experience varies widely.
 */
const TYPICAL_SYMPTOM_CLUSTERS: Record<CanonicalStage, string[]> = {
  LATE_REPRODUCTIVE: ['subtle cycle changes', 'sleep shifts', 'mood variability'],
  EARLY_PERI: ['vasomotor symptoms', 'sleep disruption', 'mood changes', 'cycle irregularity'],
  LATE_PERI: ['vasomotor symptoms', 'sleep problems', 'cycle irregularity'],
  EARLY_POST: ['vasomotor symptoms', 'mood changes', 'genitourinary symptoms'],
  LATE_POST: ['genitourinary symptoms', 'joint and muscular symptoms'],
  SURGICAL: ['vasomotor symptoms', 'mood changes', 'sleep disruption'],
  IATROGENIC: ['vasomotor symptoms', 'mood changes', 'fatigue'],
  HYSTERECTOMY_OVARIES_INTACT: [
    'hormonal fluctuation (ovaries intact)',
    'vasomotor symptoms',
    'mood changes',
  ],
};

/** Natural-language phrase for dashboard framing, e.g. "late perimenopause". */
const TRACKING_PHRASES: Record<CanonicalStage, string> = {
  LATE_REPRODUCTIVE: 'late reproductive life',
  EARLY_PERI: 'early perimenopause',
  LATE_PERI: 'late perimenopause',
  EARLY_POST: 'early postmenopause',
  LATE_POST: 'late postmenopause',
  SURGICAL: 'surgical menopause',
  IATROGENIC: 'treatment-related menopause',
  HYSTERECTOMY_OVARIES_INTACT: 'life after hysterectomy with ovaries intact',
};

function strawCodeToCanonical(code: StrawStageCode): CanonicalStage {
  switch (code) {
    case '-3b':
    case '-3a':
      return 'LATE_REPRODUCTIVE';
    case '-2':
      return 'EARLY_PERI';
    case '-1':
      return 'LATE_PERI';
    case '+1a':
    case '+1b':
    case '+1c':
      return 'EARLY_POST';
    case '+2':
      return 'LATE_POST';
    case 'surgical':
      return 'SURGICAL';
    case 'iatrogenic':
      return 'IATROGENIC';
    case 'hysterectomy_ovaries_intact':
      return 'HYSTERECTOMY_OVARIES_INTACT';
  }
}

function menopauseCauseToAnswer(profile: Profile): MenopauseCauseAnswer | null {
  if (profile.straw_stage === 'surgical') return 'oophorectomy';
  if (profile.straw_stage === 'iatrogenic') return 'medical_treatment';
  if (profile.straw_stage === 'hysterectomy_ovaries_intact') return 'hysterectomy';

  switch (profile.menopause_cause) {
    case 'natural':
      return 'natural';
    case 'unknown':
      return 'unsure';
    case 'chemotherapy':
    case 'radiation':
      return 'medical_treatment';
    case 'hysterectomy':
      return 'hysterectomy';
    case 'surgical':
      return 'oophorectomy';
    default:
      return null;
  }
}

function profileToStagingAnswers(profile: Profile): StagingAnswers {
  return {
    periodsStatus: profile.periods_status,
    periodChanges: profile.period_changes,
    lastPeriodTimeframe: profile.last_period_timeframe,
    menopauseCauseAnswer:
      profile.periods_status === 'stopped' ? menopauseCauseToAnswer(profile) : null,
  };
}

function buildStageProfile(
  strawCode: StrawStageCode,
  label: string,
  description: string,
): StageProfile {
  const stage = strawCodeToCanonical(strawCode);
  return {
    stage,
    label,
    description,
    typicalSymptomClusters: [...TYPICAL_SYMPTOM_CLUSTERS[stage]],
  };
}

function profileFromStoredStage(profile: Profile): StageProfile | null {
  if (!profile.staging_completed_at || !profile.straw_stage) return null;
  const details = STAGE_DETAILS[profile.straw_stage];
  return buildStageProfile(
    profile.straw_stage,
    profile.straw_stage_label ?? details.label,
    details.description,
  );
}

/**
 * Resolve the user's STRAW+10 stage from stored onboarding answers.
 * Returns unknown (null stage) when answers are incomplete — never guesses.
 */
export function getStageProfile(profile: Profile | null | undefined): StageProfile {
  if (!profile) return UNKNOWN_STAGE_PROFILE;

  const answers = profileToStagingAnswers(profile);
  const computed = computeStagingResult(answers);
  if (computed) {
    return buildStageProfile(
      computed.strawStage,
      computed.strawStageLabel,
      computed.description,
    );
  }

  const stored = profileFromStoredStage(profile);
  if (stored) return stored;

  return UNKNOWN_STAGE_PROFILE;
}

/** Dashboard context line fragment, e.g. "late perimenopause"; null when unknown. */
export function getStageTrackingPhrase(profile: StageProfile | null | undefined): string | null {
  if (!profile?.stage) return null;
  return TRACKING_PHRASES[profile.stage] ?? null;
}

/** Self-check helper — validates resolution for representative answer sets. */
export function _selfCheckStageProfile(): boolean {
  const latePeri = getStageProfile({
    periods_status: 'changing',
    period_changes: 'skipping',
    last_period_timeframe: null,
    menopause_cause: null,
    straw_stage: null,
    straw_stage_label: null,
    staging_completed_at: null,
  } as Profile);
  if (latePeri.stage !== 'LATE_PERI') return false;

  const earlyPost = getStageProfile({
    periods_status: 'stopped',
    period_changes: null,
    last_period_timeframe: '1_to_3yr',
    menopause_cause: 'natural',
    straw_stage: '+1a',
    straw_stage_label: 'Early Postmenopause',
    staging_completed_at: '2024-01-01T00:00:00Z',
  } as Profile);
  if (earlyPost.stage !== 'EARLY_POST') return false;

  const lateRepro = getStageProfile({
    periods_status: 'regular',
    period_changes: null,
    last_period_timeframe: null,
    menopause_cause: null,
    straw_stage: '-3b',
    straw_stage_label: 'Late Reproductive',
    staging_completed_at: '2024-01-01T00:00:00Z',
  } as Profile);
  if (lateRepro.stage !== 'LATE_REPRODUCTIVE') return false;

  const incomplete = getStageProfile({
    periods_status: 'stopped',
    period_changes: null,
    last_period_timeframe: null,
    menopause_cause: null,
    straw_stage: null,
    straw_stage_label: null,
    staging_completed_at: null,
  } as Profile);
  if (incomplete.stage !== null) return false;

  return true;
}
