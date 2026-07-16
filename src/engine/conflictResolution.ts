import { addDaysISO, daysBetweenISO } from '../utils/localDate';
import type { Insight, InsightSampleSize, InsightConfidence } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import { confidenceSortScore } from './confidence';

const CONFIDENCE_GAP_THRESHOLD = 0.25;

function daysBetween(from: string, to: string): number {
  return Math.abs(daysBetweenISO(from, to));
}

function windowsOverlap(a: Insight, b: Insight): boolean {
  if (!a.conflict || !b.conflict) return false;
  if (
    a.conflict.medicationChangeId &&
    b.conflict.medicationChangeId &&
    a.conflict.medicationChangeId === b.conflict.medicationChangeId
  ) {
    return true;
  }
  const overlapStart =
    a.conflict.windowStart > b.conflict.windowStart
      ? a.conflict.windowStart
      : b.conflict.windowStart;
  const overlapEnd =
    a.conflict.windowEnd < b.conflict.windowEnd ? a.conflict.windowEnd : b.conflict.windowEnd;
  if (overlapStart > overlapEnd) return false;
  return daysBetween(overlapStart, overlapEnd) >= 14;
}

function directionsOppose(a: Insight, b: Insight): boolean {
  if (!a.conflict || !b.conflict) return false;
  return a.conflict.direction !== b.conflict.direction;
}

function mergeSampleSize(a: Insight, b: Insight): InsightSampleSize {
  if ('before' in a.sampleSize && 'before' in b.sampleSize) {
    return {
      before: Math.max(a.sampleSize.before, b.sampleSize.before),
      after: Math.max(a.sampleSize.after, b.sampleSize.after),
    };
  }
  const nA = 'n' in a.sampleSize ? a.sampleSize.n : 0;
  const nB = 'n' in b.sampleSize ? b.sampleSize.n : 0;
  return { n: Math.max(nA, nB) };
}

function averagedConfidence(a: Insight, b: Insight, sampleSize: InsightSampleSize): InsightConfidence {
  const scoreA = confidenceSortScore(a.confidence);
  const scoreB = confidenceSortScore(b.confidence);
  const avgScore = (scoreA + scoreB) / 2;
  const basis =
    'before' in sampleSize
      ? `based on ${sampleSize.before} check-in${sampleSize.before === 1 ? '' : 's'} before and ${sampleSize.after} after`
      : `based on ${sampleSize.n} check-in${sampleSize.n === 1 ? '' : 's'}`;
  return {
    score: avgScore,
    level: avgScore < 0.4 ? 'low' : avgScore <= 0.7 ? 'moderate' : 'high',
    basis,
  };
}

function buildMixedSignalsBody(a: Insight, b: Insight): string {
  const aMrs = a.category === 'dose_correlation';
  const bMrs = b.category === 'dose_correlation';
  const aEnergy = a.id.startsWith('wb-dose-');
  const bEnergy = b.id.startsWith('wb-dose-');

  if ((aMrs && bEnergy) || (bMrs && aEnergy)) {
    const mrs = aMrs ? a : b;
    const energy = aEnergy ? a : b;
    const mrsHigher = mrs.conflict?.direction === 'worsening';
    const energyHigher = energy.conflict?.direction === 'improvement';

    if (mrsHigher && energyHigher) {
      return "The picture is mixed here. Your weekly symptom scores were higher in the three weeks after this dose change, but your daily energy was better over the same period. Both patterns are real in your data and they don't agree. This is worth looking at with your provider.";
    }
    if (!mrsHigher && !energyHigher) {
      return "The picture is mixed here. Your weekly symptom scores were lower after this dose change, but your daily energy readings were also lower over the same period. Both patterns show up in your data and they paint different pictures. This is worth looking at with your provider.";
    }
    return "The picture is mixed here. Your weekly symptom scores and daily energy readings moved in opposite directions around this dose change. Both patterns are real in your data and they don't agree. This is worth looking at with your provider.";
  }

  return "The picture is mixed here. Two patterns in your data around the same medication change point in opposite directions. Both are worth reviewing with your provider.";
}

function buildMixedSignalsInsight(a: Insight, b: Insight): Insight {
  const changeId =
    a.conflict?.medicationChangeId ?? b.conflict?.medicationChangeId ?? 'overlap';
  const sampleSize = mergeSampleSize(a, b);
  const coreBody = buildMixedSignalsBody(a, b);
  const windowStart =
    a.conflict!.windowStart < b.conflict!.windowStart
      ? a.conflict!.windowStart
      : b.conflict!.windowStart;
  const windowEnd =
    a.conflict!.windowEnd > b.conflict!.windowEnd ? a.conflict!.windowEnd : b.conflict!.windowEnd;

  return {
    id: `mixed-signals-${changeId}`,
    category: 'mixed_signals',
    priority: 'medium',
    title: 'Mixed signals around your recent dose change',
    body: finalizeInsightBody(coreBody, sampleSize, true),
    sampleSize,
    confidence: averagedConfidence(a, b, sampleSize),
    supportingData: {
      mergedInsightIds: [a.id, b.id],
      beforePeriod: { startDate: windowStart, endDate: windowEnd },
    },
    mergedFrom: [a.id, b.id],
    relatedMedication: a.relatedMedication ?? b.relatedMedication,
    actionSuggestion:
      'Bring both patterns to your next appointment and ask which matters more for your symptoms.',
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Marks losers as demotedToMore and emits mixed_signals cards for comparable-confidence conflicts.
 * No insight is removed from the returned list.
 */
export function resolveConflicts(insights: Insight[]): Insight[] {
  const result = insights.map((insight) => ({ ...insight }));
  const byId = new Map(result.map((i) => [i.id, i]));
  const mixedToAdd: Insight[] = [];
  const processedPairs = new Set<string>();
  const conflictInsights = result.filter((i) => i.conflict);

  for (let i = 0; i < conflictInsights.length; i++) {
    for (let j = i + 1; j < conflictInsights.length; j++) {
      const a = conflictInsights[i];
      const b = conflictInsights[j];
      const pairKey = [a.id, b.id].sort().join('|');
      if (processedPairs.has(pairKey)) continue;
      if (!windowsOverlap(a, b) || !directionsOppose(a, b)) continue;
      processedPairs.add(pairKey);

      const gap = Math.abs(
        confidenceSortScore(a.confidence) - confidenceSortScore(b.confidence),
      );
      if (gap < CONFIDENCE_GAP_THRESHOLD) {
        byId.get(a.id)!.demotedToMore = true;
        byId.get(b.id)!.demotedToMore = true;
        const mixedId = `mixed-signals-${a.conflict!.medicationChangeId ?? b.conflict!.medicationChangeId ?? 'overlap'}`;
        if (!mixedToAdd.some((m) => m.id === mixedId)) {
          mixedToAdd.push(buildMixedSignalsInsight(byId.get(a.id)!, byId.get(b.id)!));
        }
      } else {
        const winner =
          confidenceSortScore(a.confidence) >= confidenceSortScore(b.confidence) ? a : b;
        const loser = winner.id === a.id ? b : a;
        byId.get(loser.id)!.demotedToMore = true;
      }
    }
  }

  return [...result, ...mixedToAdd];
}

export function conflictWindowForChange(changeDate: string, windowDays: number) {
  return {
    windowStart: addDaysISO(changeDate, -windowDays),
    windowEnd: addDaysISO(changeDate, windowDays),
  };
}
