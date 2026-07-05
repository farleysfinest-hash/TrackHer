import { analyzeDoseCorrelations } from './doseCorrelation';
import { analyzeSymptomClusters } from './clusterMatcher';
import { analyzeLabDiscordance } from './labDiscordance';
import { analyzeTrends } from './trendDetector';
import type { Insight, InsightPriority } from './types';
import type {
  SymptomCheckin,
  ExtendedSymptomLog,
  Medication,
  MedicationChange,
  LabResult,
  Profile,
} from '../types/database';

export interface EngineInput {
  checkins: SymptomCheckin[];
  extendedSymptoms: ExtendedSymptomLog[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  labResults: LabResult[];
  profile: Profile | null;
}

const PRIORITY_ORDER: Record<InsightPriority, number> = {
  high: 0,
  medium: 1,
  positive: 2,
  low: 3,
};

export function runPatternEngine(input: EngineInput): Insight[] {
  if (!input.profile || input.checkins.length === 0) {
    return [];
  }

  const doseInsights = analyzeDoseCorrelations({
    checkins: input.checkins,
    medicationChanges: input.medicationChanges,
    medications: input.medications,
  });

  const clusterInsights = analyzeSymptomClusters({
    checkins: input.checkins,
    extendedSymptoms: input.extendedSymptoms,
  });

  const labInsights = analyzeLabDiscordance({
    checkins: input.checkins,
    labResults: input.labResults,
  });

  const trendInsights = analyzeTrends({
    checkins: input.checkins,
    medications: input.medications,
    labResults: input.labResults,
  });

  const seen = new Set<string>();
  const allInsights = [
    ...doseInsights,
    ...clusterInsights,
    ...labInsights,
    ...trendInsights,
  ].filter((insight) => {
    if (seen.has(insight.id)) return false;
    seen.add(insight.id);
    return true;
  });

  allInsights.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.generatedAt.localeCompare(a.generatedAt);
  });

  return allInsights;
}
