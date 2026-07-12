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
  | 'observation';

export type InsightPriority = 'high' | 'medium' | 'low' | 'positive';

export type InsightSampleSize = { before: number; after: number } | { n: number };

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
}

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  body: string;
  sampleSize: InsightSampleSize;
  supportingData: InsightSupportingData;
  relatedMedication?: string;
  relatedSymptoms?: string[];
  relatedLabs?: string[];
  actionSuggestion?: string;
  disclaimer: string;
  generatedAt: string;
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
