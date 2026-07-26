import { addDaysISO, daysBetweenISO } from '../utils/localDate';
import type { Insight, InsightSampleSize, InsightConfidence } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import { confidenceSortScore } from './confidence';
import { HORMONE_PATTERNS, patternsOppose, type HormonePattern } from './hormonePatterns';

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

/* ------------------------------------------------------------------ *
 * Opposing hormone patterns
 *
 * Separate from the dose-change conflicts above: InsightConflictMeta describes an
 * improvement/worsening direction inside a window around a medication change, which cannot
 * express "low estrogen versus high estrogen". These conflicts are matched on the pattern
 * axis instead.
 * ------------------------------------------------------------------ */

const PATTERNS_BY_KEY = new Map(HORMONE_PATTERNS.map((p) => [p.key, p]));

function patternForInsight(insight: Insight): HormonePattern | undefined {
  if (insight.category !== 'symptom_cluster') return undefined;
  const key = insight.supportingData.matchedPattern;
  return typeof key === 'string' ? PATTERNS_BY_KEY.get(key) : undefined;
}

/** Swap dose-direction questions for measurement questions on a conflicted card. */
function withConflictSafeActions(insight: Insight, pattern: HormonePattern): Insight {
  if (!pattern.conflictDiscussionPoints) return insight;
  return {
    ...insight,
    actionSuggestion: `Questions to consider for your provider:\n${pattern.conflictDiscussionPoints
      .map((q) => `• ${q}`)
      .join('\n')}`,
  };
}

function buildAxisConflictInsight(
  low: { insight: Insight; pattern: HormonePattern },
  high: { insight: Insight; pattern: HormonePattern },
): Insight {
  const axis = low.pattern.axis as string;
  const sampleSize = mergeSampleSize(low.insight, high.insight);
  // Both patterns require three or more of their own hallmark symptoms, and their hallmark sets
  // do not overlap. So co-firing means genuinely logging both groups, not double-counting.
  //
  // The two axes need different explanations. The estrogen "high" pattern is a ratio pattern —
  // estrogen high *relative to progesterone* — so low-estrogen and high-ratio symptoms together
  // are not a contradiction at all. They are the classic transition picture: estradiol swinging
  // while progesterone falls away with anovulatory cycles. Calling that "we cannot tell" would
  // be both less accurate and less useful than naming it. Androgen excess and deficiency really
  // are contradictory, so testosterone keeps the measure-it framing.
  const body =
    axis === 'estrogen'
      ? `You are logging symptoms from two groups at once: some that go with estrogen running low, ` +
        `and some that go with estrogen running high relative to progesterone.\n\n` +
        `That combination is not a contradiction, and it does not mean your data is confusing. ` +
        `It is a common picture during the menopause transition, when estrogen swings up and down ` +
        `rather than declining smoothly, while progesterone falls away earlier and more steadily. ` +
        `The low-estrogen symptoms tend to come from the dips, and the others from the peaks with ` +
        `less progesterone to balance them.\n\n` +
        `The useful question here is usually about progesterone and about timing — when in the month ` +
        `each group of symptoms shows up — rather than simply whether your estrogen is too high or too low. ` +
        `That is a conversation for your provider. Please do not change a dose on the strength of this card.`
      : `Your symptoms currently match both a low and a high ${axis} pattern. ` +
        `Unlike estrogen, these two genuinely point in opposite directions, and acting on the wrong one ` +
        `would make things worse.\n\n` +
        `Symptoms on their own cannot separate them — this is a case where a blood level genuinely helps, ` +
        `alongside your provider's read. Please do not change a dose on the strength of this card.`;

  return {
    id: `axis-conflict-${axis}`,
    category: 'mixed_signals',
    // High, not medium: this card exists to stop a harmful dose change, so it must not be
    // pushed out of the primary panel by the cap.
    priority: 'high',
    title:
      axis === 'estrogen'
        ? 'Two symptom groups at once — a common transition picture'
        : `Your ${axis} signals point both ways`,
    body: finalizeInsightBody(body, sampleSize, true),
    sampleSize,
    confidence: averagedConfidence(low.insight, high.insight, sampleSize),
    supportingData: {
      mergedInsightIds: [low.insight.id, high.insight.id],
      matchedPattern: `${low.pattern.key}+${high.pattern.key}`,
    },
    mergedFrom: [low.insight.id, high.insight.id],
    relatedLabs: [
      ...new Set([
        ...low.pattern.relatedLabs.map((l) => l.biomarkerKey),
        ...high.pattern.relatedLabs.map((l) => l.biomarkerKey),
      ]),
    ],
    actionSuggestion:
      axis === 'estrogen'
        ? `Questions to consider for your provider:\n` +
          `• I get both sets of symptoms — could my progesterone be part of this?\n` +
          `• Does it matter when in the month each group shows up?\n` +
          `• Would tracking the timing for a cycle or two help you decide?`
        : `Questions to consider for your provider:\n` +
          `• Could we measure my ${axis} level before changing my dose?\n` +
          `• Which of these symptoms would you weight most heavily?`,
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Merges opposing hormone-pattern cards into one honest "points both ways" card.
 *
 * Both originals are demoted rather than deleted, matching resolveConflicts. Because demoted
 * insights still render under "more", their contradictory dose questions are also rewritten —
 * demotion alone would leave "increase your estradiol" one tap from "your estrogen is too high".
 */
export function resolveHormoneAxisConflicts(insights: Insight[]): Insight[] {
  const result = insights.map((insight) => ({ ...insight }));
  const clusters = result
    .map((insight) => ({ insight, pattern: patternForInsight(insight) }))
    .filter((entry): entry is { insight: Insight; pattern: HormonePattern } =>
      entry.pattern !== undefined && entry.pattern.axis !== undefined,
    );

  const added: Insight[] = [];
  const seenAxes = new Set<string>();

  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const a = clusters[i];
      const b = clusters[j];
      if (!patternsOppose(a.pattern, b.pattern)) continue;

      const axis = a.pattern.axis as string;
      if (seenAxes.has(axis)) continue;
      seenAxes.add(axis);

      const low = a.pattern.axisDirection === 'low' ? a : b;
      const high = low === a ? b : a;

      for (const entry of [low, high]) {
        const index = result.findIndex((r) => r.id === entry.insight.id);
        if (index === -1) continue;
        result[index] = withConflictSafeActions(
          { ...result[index], demotedToMore: true },
          entry.pattern,
        );
      }

      added.push(buildAxisConflictInsight(low, high));
    }
  }

  return [...result, ...added];
}

export function conflictWindowForChange(changeDate: string, windowDays: number) {
  return {
    windowStart: addDaysISO(changeDate, -windowDays),
    windowEnd: addDaysISO(changeDate, windowDays),
  };
}
