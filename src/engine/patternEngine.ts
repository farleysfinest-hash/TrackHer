import { analyzeDoseCorrelations } from './doseCorrelation';
import { analyzeSymptomClusters } from './clusterMatcher';
import { analyzeLabDiscordance, analyzeLabRangeFlags } from './labDiscordance';
import { analyzeTrends } from './trendDetector';
import { analyzeEarlyObservations } from './earlyObservations';
import { analyzeWellbeingSignal } from './wellbeingSignal';
import { analyzeSafeguarding } from './safeguarding';
import { resolveConflicts } from './conflictResolution';
import {
  buildEngineInputCacheKey,
  getCachedEngineResult,
  peekCachedEngineResult,
  setCachedEngineResult,
} from './insightCache';
import { applyInsightRecomputationNotices } from './insightRecomputation';
import { confidenceSortScore } from './confidence';
import type { Insight, InsightPriority, EngineInput, PatternEngineResult } from './types';

export type { EngineInput, PatternEngineResult };

const PRIORITY_ORDER: Record<InsightPriority, number> = {
  high: 0,
  medium: 1,
  positive: 2,
  low: 3,
};

const PRIMARY_PANEL_CAP = 3;

function capObservations(insights: Insight[]): Insight[] {
  const hasHigherPriority = insights.some(
    (i) => i.priority === 'high' || i.priority === 'medium' || i.priority === 'positive',
  );
  if (!hasHigherPriority) return insights;

  const observations = insights.filter((i) => i.category === 'observation');
  const others = insights.filter((i) => i.category !== 'observation');
  return [...others, ...observations.slice(0, 1)];
}

function partitionPanel(insights: Insight[]): PatternEngineResult {
  const primaryCandidates = insights
    .filter(
      (i) => i.confidence.level !== 'low' && !i.demotedToMore,
    )
    .sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return confidenceSortScore(b.confidence) - confidenceSortScore(a.confidence);
    });

  const primary = primaryCandidates.slice(0, PRIMARY_PANEL_CAP);
  const primaryIds = new Set(primary.map((i) => i.id));
  const more = insights.filter((i) => !primaryIds.has(i.id));

  return { primary, more, safeguarding: [], all: insights };
}

function runPatternEngineInternal(input: EngineInput): PatternEngineResult {
  if (!input.profile || input.checkins.length === 0) {
    return { primary: [], more: [], safeguarding: [], all: [] };
  }

  const { timezone } = input;

  const safeguardingResults = analyzeSafeguarding({
    checkins: input.checkins,
    timezone,
  });
  const safeguarding = safeguardingResults.filter((i) => i.category === 'safeguarding');
  const safeguardingOrdinary = safeguardingResults.filter((i) => i.category !== 'safeguarding');

  const doseInsights = analyzeDoseCorrelations({
    checkins: input.checkins,
    medicationChanges: input.medicationChanges,
    medications: input.medications,
  });

  const clusterInsights = analyzeSymptomClusters({
    checkins: input.checkins,
    extendedSymptoms: input.extendedSymptoms,
    timezone,
  });

  const labInsights = [
    ...analyzeLabDiscordance({
      checkins: input.checkins,
      labResults: input.labResults,
    }),
    ...analyzeLabRangeFlags(input.labResults),
  ];

  const trendInsights = analyzeTrends({
    checkins: input.checkins,
    medications: input.medications,
    labResults: input.labResults,
    timezone,
  });

  const wellbeingInsights = analyzeWellbeingSignal({
    checkins: input.checkins,
    medicationChanges: input.medicationChanges,
    medications: input.medications,
    administrations: input.administrations,
    timezone,
  });

  const observationInsights = analyzeEarlyObservations({
    checkins: input.checkins,
  });

  const seen = new Set<string>();
  const collected = [
    ...safeguardingOrdinary,
    ...doseInsights,
    ...wellbeingInsights,
    ...clusterInsights,
    ...labInsights,
    ...trendInsights,
    ...observationInsights,
  ].filter((insight) => {
    if (seen.has(insight.id)) return false;
    seen.add(insight.id);
    return true;
  });

  const capped = capObservations(collected);
  const resolved = resolveConflicts(capped);
  const ranked = [...resolved].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return confidenceSortScore(b.confidence) - confidenceSortScore(a.confidence);
  });
  const partitioned = partitionPanel(ranked);
  return {
    ...partitioned,
    safeguarding,
    all: [...partitioned.all, ...safeguarding],
  };
}

let hasWarnedAboutUncacheableInput = false;

export function runPatternEngine(input: EngineInput): PatternEngineResult {
  const ownerId = input.profile?.id ?? null;
  const cacheKey = buildEngineInputCacheKey(input);
  if (cacheKey === null && !hasWarnedAboutUncacheableInput) {
    console.warn(
      'Pattern engine cache bypassed because the input contains a non-serializable value.',
    );
    hasWarnedAboutUncacheableInput = true;
  }
  if (cacheKey !== null) {
    const cached = getCachedEngineResult(ownerId, cacheKey);
    if (cached) return cached;
  }

  const previous = cacheKey === null ? null : peekCachedEngineResult(ownerId);
  const result = runPatternEngineInternal(input);
  const withNotices = applyInsightRecomputationNotices(result, previous, input.checkins);
  if (cacheKey !== null) {
    setCachedEngineResult(ownerId, cacheKey, withNotices);
  }
  return withNotices;
}

/** @deprecated Use runPatternEngine — returns all insights flat for legacy callers. */
export function runPatternEngineFlat(input: EngineInput): Insight[] {
  return runPatternEngine(input).all;
}
