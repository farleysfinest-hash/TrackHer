export type SeverityLevel = 'none' | 'mild' | 'moderate' | 'severe';

export type ScoringMethod = 'sum' | 'mean' | 'scaled_mean';

export interface SeverityBands {
  none: [number, number];
  mild: [number, number];
  moderate: [number, number];
  severe: [number, number];
}

export interface InstrumentItem {
  id: string;
  label: string;
  description: string;
  subscale: string;
  /** Maps to symptom_checkins column or storage key when different from id */
  storageKey?: string;
}

export interface InstrumentSubscale {
  id: string;
  label: string;
  items: string[];
  maxScore: number;
  severityBands: SeverityBands;
}

export interface InstrumentDefinition {
  id: string;
  name: string;
  abbreviation: string;
  version: string;
  citation: string;
  description: string;
  recallPeriod: string;
  scoringMethod: ScoringMethod;
  scaleRange: [number, number];
  totalScoreRange: [number, number];
  items: InstrumentItem[];
  subscales: InstrumentSubscale[];
  totalSeverityBands: SeverityBands;
  targetStages: string[];
  scoringFunction: (responses: Record<string, number>) => InstrumentScore;
}

export interface InstrumentScore {
  instrumentId: string;
  total: number;
  totalSeverity: SeverityLevel;
  subscales: Record<
    string,
    {
      score: number;
      severity: SeverityLevel;
    }
  >;
  completedAt: string;
  itemResponses: Record<string, number>;
}

export interface AssessmentResult {
  id: string;
  user_id: string;
  instrument_id: string;
  checkin_id: string | null;
  total_score: number;
  total_severity: SeverityLevel;
  subscale_scores: Record<string, { score: number; severity: SeverityLevel }>;
  item_responses: Record<string, number>;
  assessed_at: string;
  created_at: string;
}
