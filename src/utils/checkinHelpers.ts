import type { MRSScore, SymptomCheckin } from '../types/database';
import type { InstrumentDefinition } from '../types/instruments';
import { MRS_CANONICAL_SYMPTOMS } from '../data/symptoms';
import { MRS_INSTRUMENT } from '../data/instruments/mrs';
import {
  scoreInstrument,
  getItemStorageKey,
  getSeverityLabel,
} from '../data/instruments/scoring';

/** Canonical 11-item Menopause Rating Scale — only these count toward MRS total (max 44). */
export const MRS_ITEMS = {
  psychological: ['depressed_mood', 'irritability', 'anxiety', 'exhaustion'] as const,
  somatic: ['hot_flashes', 'heart_discomfort', 'sleep_problems', 'joint_muscle_pain'] as const,
  urogenital: ['sexual_problems', 'bladder_problems', 'vaginal_dryness'] as const,
} as const;

export const MRS_CANONICAL_KEYS = [
  ...MRS_ITEMS.psychological,
  ...MRS_ITEMS.somatic,
  ...MRS_ITEMS.urogenital,
] as const;

export type MRSSymptomKey = (typeof MRS_CANONICAL_KEYS)[number];

/** Legacy DB columns — stored on check-ins but excluded from MRS scoring. */
export const LEGACY_MRS_EXTRA_KEYS = [
  'dry_itchy_skin',
  'brain_fog',
  'irregular_periods',
  'heavy_bleeding',
  'misophonia',
] as const;

export type LegacyMRSSymptomKey = (typeof LEGACY_MRS_EXTRA_KEYS)[number];

/** All symptom columns on symptom_checkins table. */
export const ALL_CHECKIN_SYMPTOM_KEYS = [
  ...MRS_CANONICAL_KEYS,
  ...LEGACY_MRS_EXTRA_KEYS,
] as const;

/** @deprecated Use MRS_CANONICAL_KEYS — kept for gradual migration of imports. */
export const MRS_SYMPTOM_KEYS = ALL_CHECKIN_SYMPTOM_KEYS;

export type MRSScoresMap = Record<MRSSymptomKey, MRSScore | null>;

export const INITIAL_MRS_SCORES: MRSScoresMap = {
  hot_flashes: null,
  heart_discomfort: null,
  sleep_problems: null,
  depressed_mood: null,
  irritability: null,
  anxiety: null,
  exhaustion: null,
  sexual_problems: null,
  bladder_problems: null,
  vaginal_dryness: null,
  joint_muscle_pain: null,
};

export type MRSSeverityLevel = 'none' | 'mild' | 'moderate' | 'severe';

export interface MRSScoreResult {
  total: number;
  psychological: number;
  somatic: number;
  urogenital: number;
  totalSeverity: MRSSeverityLevel;
  psychologicalSeverity: MRSSeverityLevel;
  somaticSeverity: MRSSeverityLevel;
  urogenitalSeverity: MRSSeverityLevel;
}

function subscaleSeverity(
  score: number,
  subscale: 'psychological' | 'somatic' | 'urogenital',
): MRSSeverityLevel {
  if (subscale === 'urogenital') {
    if (score <= 2) return 'none';
    if (score <= 5) return 'mild';
    if (score <= 8) return 'moderate';
    return 'severe';
  }
  if (score <= 3) return 'none';
  if (score <= 7) return 'mild';
  if (score <= 11) return 'moderate';
  return 'severe';
}

function totalSeverity(score: number): MRSSeverityLevel {
  if (score <= 4) return 'none';
  if (score <= 16) return 'mild';
  if (score <= 24) return 'moderate';
  return 'severe';
}

export function calculateMRS(responses: Record<string, number | null | undefined>): MRSScoreResult {
  const instrumentScore = scoreInstrument(responses, MRS_INSTRUMENT);
  return {
    total: instrumentScore.total,
    psychological: instrumentScore.subscales.psychological?.score ?? 0,
    somatic: instrumentScore.subscales.somatic?.score ?? 0,
    urogenital: instrumentScore.subscales.urogenital?.score ?? 0,
    totalSeverity: instrumentScore.totalSeverity,
    psychologicalSeverity: instrumentScore.subscales.psychological?.severity ?? 'none',
    somaticSeverity: instrumentScore.subscales.somatic?.severity ?? 'none',
    urogenitalSeverity: instrumentScore.subscales.urogenital?.severity ?? 'none',
  };
}

export function calculateInstrumentScore(
  responses: Record<string, number | null | undefined>,
  instrument: InstrumentDefinition,
  completedAt?: string,
) {
  return scoreInstrument(responses, instrument, completedAt);
}

export function countRatedInstrumentItems(
  scores: Record<string, number | null | undefined>,
  instrument: InstrumentDefinition,
): number {
  return instrument.items.filter((item) => {
    const key = getItemStorageKey(item);
    return scores[key] !== null && scores[key] !== undefined;
  }).length;
}

export function computeTotalMRS(scores: MRSScoresMap): number {
  return calculateMRS(scores).total;
}

export function computeSomaticScore(scores: MRSScoresMap): number {
  return calculateMRS(scores).somatic;
}

export function computePsychologicalScore(scores: MRSScoresMap): number {
  return calculateMRS(scores).psychological;
}

export function computeUrogenitalScore(scores: MRSScoresMap): number {
  return calculateMRS(scores).urogenital;
}

/** @deprecated Use MRSSeverityLevel — alias for chart compatibility */
export type MRSSeverityTier = MRSSeverityLevel;

export function getMRSSeverityTier(total: number): MRSSeverityLevel {
  return totalSeverity(total);
}

/** Published MRS total-score severity bands (Heinemann et al.): 0–4 none, 5–8 mild, 9–16 moderate, 17+ severe. */
export interface MRSSeverityBandInfo {
  level: MRSSeverityLevel;
  bandLabel: string;
  rangePhrase: string;
  meaning: string;
}

export function getMRSSeverityBand(total: number): MRSSeverityBandInfo {
  if (total <= 4) {
    return {
      level: 'none',
      bandLabel: 'no/minimal',
      rangePhrase: 'in the no/minimal range on this scale',
      meaning: 'Few or no symptoms were reported on the MRS scale.',
    };
  }
  if (total <= 8) {
    return {
      level: 'mild',
      bandLabel: 'mild',
      rangePhrase: 'in the mild range on this scale',
      meaning: 'A mild symptom burden on this scale — worth tracking as you check in over time.',
    };
  }
  if (total <= 16) {
    return {
      level: 'moderate',
      bandLabel: 'moderate',
      rangePhrase: 'in the moderate range on this scale',
      meaning:
        'Moderate symptoms on this scale — often clinically relevant to discuss with a provider.',
    };
  }
  return {
    level: 'severe',
    bandLabel: 'severe',
    rangePhrase: 'in the severe range on this scale',
    meaning:
      'A higher symptom burden on this scale — worth sharing with your provider if you have not already.',
  };
}

export const MRS_SUBSCALE_FRIENDLY_LABELS: Record<string, string> = {
  psychological: 'Mood & mind',
  somatic: 'Body',
  urogenital: 'Urinary & vaginal',
};

export function getSubscaleSeverityTier(
  score: number,
  subscale: 'psychological' | 'somatic' | 'urogenital',
): MRSSeverityLevel {
  return subscaleSeverity(score, subscale);
}

export function getMRSSeverityLabel(tier: MRSSeverityLevel): string {
  return getSeverityLabel(tier);
}

export function getMRSSeverityColor(tier: MRSSeverityLevel): string {
  const colors: Record<MRSSeverityLevel, string> = {
    none: 'text-success',
    mild: 'text-amber-600',
    moderate: 'text-orange-600',
    severe: 'text-red-600',
  };
  return colors[tier];
}

export function getMRSSeverityDot(tier: MRSSeverityLevel): string {
  const colors: Record<MRSSeverityLevel, string> = {
    none: 'bg-success',
    mild: 'bg-amber-500',
    moderate: 'bg-orange-500',
    severe: 'bg-red-500',
  };
  return colors[tier];
}

export const MRS_SUBSCALE_LABELS = {
  psychological: 'Psychological',
  somatic: 'Somatic',
  urogenital: 'Urogenital',
} as const;

export const MRS_SUBSCALE_MAX = {
  psychological: 16,
  somatic: 16,
  urogenital: 12,
} as const;

export const MRS_TOTAL_MAX = 44;

export function getLocalDateISO(timezone = 'America/Los_Angeles'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/** Browser timezone when profile timezone is unset; LA as last resort. */
export function getResolvedTimezone(profileTimezone?: string | null): string {
  if (profileTimezone) return profileTimezone;
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz) return browserTz;
  } catch {
    // fall through
  }
  return 'America/Los_Angeles';
}

export function getWellbeingLabel(score: number): string {
  if (score <= 2) return 'Really struggling';
  if (score <= 4) return 'Having a tough time';
  if (score <= 6) return 'Managing, but not great';
  if (score <= 8) return 'Doing well';
  return 'Feeling great';
}

export function getTimeframeLabel(frequency: string | null | undefined): string {
  switch (frequency) {
    case 'weekly':
      return 'Rate your symptoms over the past week';
    case 'monthly':
      return 'Rate your symptoms over the past month';
    default:
      return 'Rate your symptoms over the past 24 hours';
  }
}

export function getTopConcerns(scores: MRSScoresMap, limit = 3) {
  const rated = MRS_CANONICAL_SYMPTOMS.map((s) => ({
    key: s.key,
    label: s.label,
    score: scores[s.key as MRSSymptomKey],
  })).filter((s): s is { key: string; label: string; score: MRSScore } => s.score !== null);

  const severe = rated.filter((s) => s.score >= 3);
  const sorted = (severe.length > 0 ? severe : rated)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return sorted;
}

export function countRatedMRS(scores: MRSScoresMap): number {
  return MRS_CANONICAL_KEYS.filter((k) => scores[k] !== null).length;
}

export function isMRSCanonicalKey(key: string): key is MRSSymptomKey {
  return (MRS_CANONICAL_KEYS as readonly string[]).includes(key);
}

export function hasMRSData(checkin: SymptomCheckin): boolean {
  return checkin.checkin_type !== 'pulse';
}

export const SEVERITY_LABELS = ['None', 'Mild', 'Moderate', 'Severe', 'Very Severe'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  body: 'Body',
  digestive: 'Digestive Health',
  mind: 'Mind & Cognition',
  sexual_pelvic: 'Sexual & Pelvic Health',
  skin_hair: 'Skin, Hair & Nails',
};
