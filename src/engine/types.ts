import type {
  SymptomCheckin,
  ExtendedSymptomLog,
  Medication,
  MedicationChange,
  MedicationAdministration,
  LabResult,
  Profile,
} from '../types/database';

export type InsightCategory =
  | 'dose_correlation'
  | 'wellbeing_signal'
  | 'symptom_cluster'
  | 'lab_discordance'
  | 'trend_alert'
  | 'positive_trend'
  | 'new_symptom'
  | 'medication_note'
  | 'lab_due'
  | 'observation'
  | 'mixed_signals';

export type InsightPriority = 'high' | 'medium' | 'low' | 'positive';

export type ConfidenceLevel = 'low' | 'moderate' | 'high' | 'provisional';

export interface InsightConfidence {
  level: ConfidenceLevel;
  score: number | null;
  basis: string;
}

export type InsightSampleSize = { before: number; after: number } | { n: number };

export interface InsightConflictMeta {
  medicationChangeId?: string;
  windowStart: string;
  windowEnd: string;
  direction: 'improvement' | 'worsening';
}

export interface InsightSupportingData {
  beforePeriod?: { startDate: string; endDate: string; avgScore?: number };
  afterPeriod?: { startDate: string; endDate: string; avgScore?: number };
  symptomScores?: Array<{
    symptomKey: string;
    label: string;
    avgBefore: number;
    avgAfter: number;
    delta: number;
  }>;
  matchedPattern?: string;
  matchedSymptoms?: Array<{ key: string; label: string; severity: number }>;
  matchConfidence?: number;
  labValue?: { biomarker: string; value: number; range: string };
  trendData?: Array<{ date: string; score: number }>;
  mergedInsightIds?: string[];
}

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  body: string;
  sampleSize: InsightSampleSize;
  confidence: InsightConfidence;
  conflict?: InsightConflictMeta;
  /** When true, insight is excluded from the primary panel and shown under "more". */
  demotedToMore?: boolean;
  /** Source insight ids replaced by a mixed_signals card. */
  mergedFrom?: string[];
  supportingData: InsightSupportingData;
  relatedMedication?: string;
  relatedSymptoms?: string[];
  relatedLabs?: string[];
  actionSuggestion?: string;
  disclaimer: string;
  generatedAt: string;
  /** Set when a backdated check-in changes an insight the user already read. */
  updateNotice?: string;
}

export interface EngineInput {
  checkins: SymptomCheckin[];
  extendedSymptoms: ExtendedSymptomLog[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  administrations: MedicationAdministration[];
  labResults: LabResult[];
  profile: Profile | null;
  /** IANA timezone from profile (via getResolvedTimezone). */
  timezone: string;
}

export interface PatternEngineResult {
  primary: Insight[];
  more: Insight[];
  all: Insight[];
}

export const INSIGHT_DISCLAIMER =
  'This is a pattern observed in your data, not a diagnosis. Always discuss changes to your hormone therapy with your healthcare provider.';

export const OBSERVED_PATTERN_LINE =
  'This is an observed pattern in your own data, not proof of cause. Many things affect symptoms.';

export function formatSampleSizeSuffix(sampleSize: InsightSampleSize): string {
  if ('n' in sampleSize) {
    const { n } = sampleSize;
    return `Based on ${n} check-in${n === 1 ? '' : 's'}.`;
  }
  const { before, after } = sampleSize;
  return `Based on ${before} check-in${before === 1 ? '' : 's'} before and ${after} after.`;
}

export function finalizeInsightBody(
  body: string,
  sampleSize: InsightSampleSize,
  includeObservedPatternLine: boolean,
): string {
  const parts = [body.trim()];
  if (includeObservedPatternLine) {
    parts.push(OBSERVED_PATTERN_LINE);
  }
  parts.push(formatSampleSizeSuffix(sampleSize));
  return parts.join(' ');
}
