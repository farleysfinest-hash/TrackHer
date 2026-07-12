import type { MRSScore, SymptomCheckin } from '../types/database';
import type { InstrumentDefinition } from '../types/instruments';
import { MRS_CANONICAL_SYMPTOMS } from '../data/symptoms';
import { MRS_INSTRUMENT } from '../data/instruments/mrs';
import {
  scoreInstrument,
  getItemStorageKey,
  getSeverityLabel,
} from '../data/instruments/scoring';
import { getMrsTotalSeverityLevel } from './mrsTotalSeverity';
import { todayISO } from './localDate';

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
  total: number | null;
  psychological: number | null;
  somatic: number | null;
  urogenital: number | null;
  totalSeverity: MRSSeverityLevel | null;
  psychologicalSeverity: MRSSeverityLevel | null;
  somaticSeverity: MRSSeverityLevel | null;
  urogenitalSeverity: MRSSeverityLevel | null;
  isComplete: boolean;
  missingItemCount: number;
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

export function calculateMRS(responses: Record<string, number | null | undefined>): MRSScoreResult {
  const instrumentScore = scoreInstrument(responses, MRS_INSTRUMENT);
  return {
    total: instrumentScore.total,
    psychological: instrumentScore.subscales.psychological?.score ?? null,
    somatic: instrumentScore.subscales.somatic?.score ?? null,
    urogenital: instrumentScore.subscales.urogenital?.score ?? null,
    totalSeverity: instrumentScore.totalSeverity,
    psychologicalSeverity: instrumentScore.subscales.psychological?.severity ?? null,
    somaticSeverity: instrumentScore.subscales.somatic?.severity ?? null,
    urogenitalSeverity: instrumentScore.subscales.urogenital?.severity ?? null,
    isComplete: instrumentScore.isComplete,
    missingItemCount: instrumentScore.missingItemCount,
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

export function computeTotalMRS(scores: MRSScoresMap): number | null {
  return calculateMRS(scores).total;
}

export function computeSomaticScore(scores: MRSScoresMap): number | null {
  return calculateMRS(scores).somatic;
}

export function computePsychologicalScore(scores: MRSScoresMap): number | null {
  return calculateMRS(scores).psychological;
}

export function computeUrogenitalScore(scores: MRSScoresMap): number | null {
  return calculateMRS(scores).urogenital;
}

/** @deprecated Use MRSSeverityLevel — alias for chart compatibility */
export type MRSSeverityTier = MRSSeverityLevel;

export function getMRSSeverityTier(total: number): MRSSeverityLevel {
  return getMrsTotalSeverityLevel(total);
}

export interface MRSSeverityBandInfo {
  level: MRSSeverityLevel;
  bandLabel: string;
  rangePhrase: string;
  meaning: string;
}

export function getMRSSeverityBand(total: number): MRSSeverityBandInfo {
  const level = getMrsTotalSeverityLevel(total);

  switch (level) {
    case 'none':
      return {
        level,
        bandLabel: 'no/minimal',
        rangePhrase: 'in the no/minimal range on this scale',
        meaning: 'Few or no symptoms were reported on the MRS scale.',
      };
    case 'mild':
      return {
        level,
        bandLabel: 'mild',
        rangePhrase: 'in the mild range on this scale',
        meaning: 'A mild symptom burden on this scale — worth tracking as you check in over time.',
      };
    case 'moderate':
      return {
        level,
        bandLabel: 'moderate',
        rangePhrase: 'in the moderate range on this scale',
        meaning:
          'Moderate symptoms on this scale — often clinically relevant to discuss with a provider.',
      };
    case 'severe':
      return {
        level,
        bandLabel: 'severe',
        rangePhrase: 'in the severe range on this scale',
        meaning:
          'A higher symptom burden on this scale — worth sharing with your provider if you have not already. Higher scores are common among women seeking care, and they are exactly what treatment adjustments aim to move.',
      };
  }
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
  return todayISO(timezone);
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

/** Daily pulse signal: energy_level when present, else legacy overall_wellbeing normalized to 1–5. */
export function getDailySignal(checkin: SymptomCheckin): number | null {
  if (checkin.energy_level !== null && checkin.energy_level !== undefined) {
    return checkin.energy_level;
  }
  if (checkin.overall_wellbeing !== null && checkin.overall_wellbeing !== undefined) {
    return Math.min(5, Math.max(1, Math.round(checkin.overall_wellbeing / 2)));
  }
  return null;
}

export function hasNewDailyChannels(checkin: SymptomCheckin): boolean {
  return (
    checkin.energy_level !== null ||
    checkin.mood_level !== null ||
    checkin.sleep_quality !== null
  );
}

/** Compact display: `Energy 4 · Mood 3 · Sleep 2/5`, or legacy `Wellbeing 7/10`. */
export function formatDailyChannels(checkin: SymptomCheckin): string {
  if (!hasNewDailyChannels(checkin) && checkin.overall_wellbeing !== null) {
    return `Wellbeing ${checkin.overall_wellbeing}/10`;
  }
  const energy = checkin.energy_level !== null ? String(checkin.energy_level) : '—';
  const mood = checkin.mood_level !== null ? String(checkin.mood_level) : '—';
  const sleep =
    checkin.sleep_quality !== null ? `${checkin.sleep_quality}/5` : '—';
  return `Energy ${energy} · Mood ${mood} · Sleep ${sleep}`;
}

export function getTimeframeLabel(frequency: string | null | undefined): string {
  // TrackHer’s MRS cadence is weekly. Keep this tolerant of legacy values.
  void frequency;
  return 'Rate your symptoms over the past week';
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

export function countMissingMrsFromCheckin(checkin: SymptomCheckin): number {
  return MRS_CANONICAL_KEYS.filter(
    (k) => checkin[k] === null || checkin[k] === undefined,
  ).length;
}

export function getIncompleteMrsMessage(missingCount: number): string {
  const total = MRS_CANONICAL_KEYS.length;
  return `This check-in is incomplete — ${missingCount} of ${total} questions unanswered, so no score was calculated.`;
}

export function hasPartialMRSData(checkin: SymptomCheckin): boolean {
  if (checkin.checkin_type === 'pulse') return false;
  const rated = countRatedMRS(checkinToScores(checkin));
  return rated > 0 && rated < MRS_CANONICAL_KEYS.length;
}

function checkinToScores(checkin: SymptomCheckin): MRSScoresMap {
  const scores = { ...INITIAL_MRS_SCORES };
  for (const key of MRS_CANONICAL_KEYS) {
    scores[key] = checkin[key];
  }
  return scores;
}

export function hasMRSData(checkin: SymptomCheckin): boolean {
  if (checkin.checkin_type === 'pulse') return false;
  return MRS_CANONICAL_KEYS.every(
    (k) => checkin[k] !== null && checkin[k] !== undefined,
  );
}

export function getTrustedMrsTotal(checkin: SymptomCheckin): number | null {
  if (!hasMRSData(checkin)) return null;
  return checkin.total_score;
}

export function isMRSCanonicalKey(key: string): key is MRSSymptomKey {
  return (MRS_CANONICAL_KEYS as readonly string[]).includes(key);
}

export const SEVERITY_LABELS = ['None', 'Mild', 'Moderate', 'Severe', 'Very Severe'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  body: 'Body',
  digestive: 'Digestive Health',
  mind: 'Mind & Cognition',
  sexual_pelvic: 'Sexual & Pelvic Health',
  skin_hair: 'Skin, Hair & Nails',
};
