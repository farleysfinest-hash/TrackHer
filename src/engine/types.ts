export type InsightCategory =
  | 'dose_correlation'
  | 'symptom_cluster'
  | 'lab_discordance'
  | 'trend_alert'
  | 'positive_trend'
  | 'new_symptom'
  | 'medication_note'
  | 'lab_due';

export type InsightPriority = 'high' | 'medium' | 'low' | 'positive';

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
