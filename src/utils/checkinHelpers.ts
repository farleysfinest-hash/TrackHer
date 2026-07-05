import type { MRSScore } from '../types/database';
import { MRS_CORE_SYMPTOMS } from '../data/symptoms';

export const MRS_SYMPTOM_KEYS = [
  'hot_flashes',
  'heart_discomfort',
  'sleep_problems',
  'depressed_mood',
  'irritability',
  'anxiety',
  'exhaustion',
  'sexual_problems',
  'bladder_problems',
  'vaginal_dryness',
  'joint_muscle_pain',
  'dry_itchy_skin',
  'brain_fog',
  'irregular_periods',
  'heavy_bleeding',
  'misophonia',
] as const;

export type MRSSymptomKey = (typeof MRS_SYMPTOM_KEYS)[number];

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
  dry_itchy_skin: null,
  brain_fog: null,
  irregular_periods: null,
  heavy_bleeding: null,
  misophonia: null,
};

export function getLocalDateISO(timezone = 'America/Los_Angeles'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
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

export function computeTotalMRS(scores: MRSScoresMap): number {
  return MRS_SYMPTOM_KEYS.reduce((sum, key) => sum + (scores[key] ?? 0), 0);
}

export function computeSomaticScore(scores: MRSScoresMap): number {
  return (
    (scores.hot_flashes ?? 0) +
    (scores.heart_discomfort ?? 0) +
    (scores.joint_muscle_pain ?? 0)
  );
}

export function computePsychologicalScore(scores: MRSScoresMap): number {
  return (
    (scores.sleep_problems ?? 0) +
    (scores.depressed_mood ?? 0) +
    (scores.irritability ?? 0) +
    (scores.anxiety ?? 0) +
    (scores.exhaustion ?? 0)
  );
}

export function computeUrogenitalScore(scores: MRSScoresMap): number {
  return (
    (scores.sexual_problems ?? 0) +
    (scores.bladder_problems ?? 0) +
    (scores.vaginal_dryness ?? 0)
  );
}

export type MRSSeverityTier = 'well_managed' | 'moderate' | 'significant' | 'severe';

export function getMRSSeverityTier(total: number): MRSSeverityTier {
  if (total <= 15) return 'well_managed';
  if (total <= 30) return 'moderate';
  if (total <= 45) return 'significant';
  return 'severe';
}

export function getMRSSeverityLabel(tier: MRSSeverityTier): string {
  const labels: Record<MRSSeverityTier, string> = {
    well_managed: 'Well managed',
    moderate: 'Moderate symptoms',
    significant: 'Significant symptoms',
    severe: 'Severe symptoms',
  };
  return labels[tier];
}

export function getMRSSeverityColor(tier: MRSSeverityTier): string {
  const colors: Record<MRSSeverityTier, string> = {
    well_managed: 'text-success',
    moderate: 'text-amber-600',
    significant: 'text-orange-600',
    severe: 'text-red-600',
  };
  return colors[tier];
}

export function getMRSSeverityDot(tier: MRSSeverityTier): string {
  const colors: Record<MRSSeverityTier, string> = {
    well_managed: 'bg-success',
    moderate: 'bg-amber-500',
    significant: 'bg-orange-500',
    severe: 'bg-red-500',
  };
  return colors[tier];
}

export function getTopConcerns(scores: MRSScoresMap, limit = 3) {
  const rated = MRS_CORE_SYMPTOMS.map((s) => ({
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
  return MRS_SYMPTOM_KEYS.filter((k) => scores[k] !== null).length;
}

export const SEVERITY_LABELS = ['None', 'Mild', 'Moderate', 'Severe', 'Very Severe'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  body: 'Body',
  digestive: 'Digestive Health',
  mind: 'Mind & Cognition',
  sexual_pelvic: 'Sexual & Pelvic Health',
  skin_hair: 'Skin, Hair & Nails',
};
