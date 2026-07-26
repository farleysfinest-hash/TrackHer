import { describe, expect, it } from 'vitest';
import { resolveHormoneAxisConflicts } from '../conflictResolution';
import { HORMONE_PATTERNS, patternsOppose } from '../hormonePatterns';
import type { Insight } from '../types';
import { INSIGHT_DISCLAIMER } from '../types';

function clusterInsight(patternKey: string, confidenceScore = 0.6): Insight {
  const pattern = HORMONE_PATTERNS.find((p) => p.key === patternKey);
  if (!pattern) throw new Error(`Unknown pattern fixture: ${patternKey}`);

  return {
    id: `cluster-${patternKey}`,
    category: 'symptom_cluster',
    priority: 'medium',
    title: `Your recent symptoms align with a ${pattern.label.toLowerCase()}`,
    body: 'body',
    sampleSize: { n: 5 },
    confidence: { score: confidenceScore, level: 'moderate', basis: 'based on 5 check-ins' },
    supportingData: { matchedPattern: patternKey },
    actionSuggestion: `Questions to consider for your provider:\n${pattern.discussionPoints
      .map((q) => `• ${q}`)
      .join('\n')}`,
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: '2026-07-25T00:00:00.000Z',
  };
}

describe('hormone pattern axis metadata', () => {
  it('pairs every axis pattern with exactly one opposing counterpart', () => {
    const axisPatterns = HORMONE_PATTERNS.filter((p) => p.axis !== undefined);
    expect(axisPatterns.length).toBeGreaterThan(0);

    for (const pattern of axisPatterns) {
      const opposing = axisPatterns.filter((other) => patternsOppose(pattern, other));
      expect(opposing).toHaveLength(1);
    }
  });

  /**
   * Allow-list, not block-list. Blacklisting direction words is unreliable prose matching —
   * "Would low-dose testosterone therapy help?" suggests a direction without using any of them.
   * Requiring each conflict question to be a measurement or consultation question is the
   * property we actually care about, and it fails closed when new copy is added.
   */
  it('makes every conflict question a measurement or consultation question', () => {
    const asksForMeasurementOrAdvice =
      /\b(check|measure|measured|level|levels|test|what would you)\b/i;

    for (const pattern of HORMONE_PATTERNS.filter((p) => p.axis !== undefined)) {
      expect(pattern.conflictDiscussionPoints).toBeDefined();
      expect(pattern.conflictDiscussionPoints!.length).toBeGreaterThan(0);

      for (const question of pattern.conflictDiscussionPoints!) {
        expect(question).toMatch(asksForMeasurementOrAdvice);
      }
    }
  });

  it('never suggests starting, stopping or moving a dose in conflict copy', () => {
    const directionalAction =
      /\b(increase[d]?|reduce[d]?|raise[d]?|lower(ed)?|too high|too low|start(ing)?|add(ing)?|low-dose|supplementation|therapy help)\b/i;

    for (const pattern of HORMONE_PATTERNS.filter((p) => p.axis !== undefined)) {
      for (const question of pattern.conflictDiscussionPoints!) {
        expect(question).not.toMatch(directionalAction);
      }
    }
  });

  it('substitutes genuinely different copy rather than reusing the normal questions', () => {
    for (const pattern of HORMONE_PATTERNS.filter((p) => p.axis !== undefined)) {
      for (const question of pattern.conflictDiscussionPoints!) {
        expect(pattern.discussionPoints).not.toContain(question);
      }
    }
  });

  it('does not treat unrelated patterns as opposing', () => {
    const thyroid = HORMONE_PATTERNS.find((p) => p.key === 'thyroid_low')!;
    const cortisol = HORMONE_PATTERNS.find((p) => p.key === 'cortisol_high')!;
    expect(patternsOppose(thyroid, cortisol)).toBe(false);
  });
});

describe('resolveHormoneAxisConflicts', () => {
  it('leaves a single estrogen pattern untouched', () => {
    const input = [clusterInsight('estrogen_low')];
    const result = resolveHormoneAxisConflicts(input);

    expect(result).toHaveLength(1);
    expect(result[0].demotedToMore).toBeUndefined();
    expect(result[0].actionSuggestion).toContain('Could my estradiol dose be increased?');
  });

  it('emits one merged card when both estrogen directions fire', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('estrogen_low'),
      clusterInsight('estrogen_high'),
    ]);

    const merged = result.filter((i) => i.category === 'mixed_signals');
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('axis-conflict-estrogen');
    // Estrogen gets its own framing: low-estrogen plus high-ratio symptoms is the classic
    // transition picture, not a contradiction, so the title must not imply confusion.
    expect(merged[0].title).toBe('Two symptom groups at once — a common transition picture');
    expect(merged[0].mergedFrom).toEqual(['cluster-estrogen_low', 'cluster-estrogen_high']);
  });

  it('demotes both originals so neither leads the panel', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('estrogen_low'),
      clusterInsight('estrogen_high'),
    ]);

    const low = result.find((i) => i.id === 'cluster-estrogen_low')!;
    const high = result.find((i) => i.id === 'cluster-estrogen_high')!;
    expect(low.demotedToMore).toBe(true);
    expect(high.demotedToMore).toBe(true);
  });

  it('strips contradictory dose questions from both demoted cards', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('estrogen_low'),
      clusterInsight('estrogen_high'),
    ]);

    const low = result.find((i) => i.id === 'cluster-estrogen_low')!;
    const high = result.find((i) => i.id === 'cluster-estrogen_high')!;

    // Demoted insights still render under "more", so the contradiction must not survive there.
    expect(low.actionSuggestion).not.toContain('dose be increased');
    expect(high.actionSuggestion).not.toContain('dose be too high');
    expect(low.actionSuggestion).toContain('before changing anything');
    expect(high.actionSuggestion).toContain('before changing anything');
  });

  it('never leaves both dose directions readable anywhere in the result', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('estrogen_low'),
      clusterInsight('estrogen_high'),
    ]);

    const allActions = result.map((i) => i.actionSuggestion ?? '').join('\n');
    const suggestsIncrease = /dose be increased/.test(allActions);
    const suggestsDecrease = /dose be too high/.test(allActions);
    expect(suggestsIncrease && suggestsDecrease).toBe(false);
  });

  it('tells the user not to change a dose, on either axis', () => {
    for (const [low, high] of [
      ['estrogen_low', 'estrogen_high'],
      ['testosterone_low', 'testosterone_high'],
    ]) {
      const result = resolveHormoneAxisConflicts([clusterInsight(low), clusterInsight(high)]);
      const merged = result.find((i) => i.category === 'mixed_signals')!;
      expect(merged.body).toMatch(/do not change a dose/i);
    }
  });

  it('points estrogen at progesterone and timing rather than at a level', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('estrogen_low'),
      clusterInsight('estrogen_high'),
    ]);
    const merged = result.find((i) => i.category === 'mixed_signals')!;

    // A single estradiol level is a poor discriminator in perimenopause, so the card must not
    // promise one settles it. The useful questions are progesterone and symptom timing.
    expect(merged.body).toMatch(/progesterone/i);
    expect(merged.body).toMatch(/not a contradiction/i);
    expect(merged.actionSuggestion).toMatch(/when in the month/i);
  });

  it('keeps the measure-it framing for testosterone, where it is correct', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('testosterone_low'),
      clusterInsight('testosterone_high'),
    ]);
    const merged = result.find((i) => i.category === 'mixed_signals')!;

    expect(merged.body).toMatch(/blood level/i);
    expect(merged.body).toMatch(/opposite directions/i);
  });

  it('carries both sides’ labs so the user knows what to ask for', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('estrogen_low'),
      clusterInsight('estrogen_high'),
    ]);
    const merged = result.find((i) => i.category === 'mixed_signals')!;

    expect(merged.relatedLabs).toContain('estradiol');
    expect(merged.relatedLabs).toContain('progesterone');
    expect(merged.relatedLabs).toContain('fsh');
    // De-duplicated: estradiol appears in both patterns.
    expect(merged.relatedLabs!.filter((l) => l === 'estradiol')).toHaveLength(1);
  });

  it('handles the testosterone axis independently of estrogen', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('testosterone_low'),
      clusterInsight('testosterone_high'),
    ]);

    const merged = result.filter((i) => i.category === 'mixed_signals');
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('axis-conflict-testosterone');
  });

  it('emits a separate card per axis when both axes conflict', () => {
    const result = resolveHormoneAxisConflicts([
      clusterInsight('estrogen_low'),
      clusterInsight('estrogen_high'),
      clusterInsight('testosterone_low'),
      clusterInsight('testosterone_high'),
    ]);

    const mergedIds = result.filter((i) => i.category === 'mixed_signals').map((i) => i.id).sort();
    expect(mergedIds).toEqual(['axis-conflict-estrogen', 'axis-conflict-testosterone']);
  });

  it('does not merge non-opposing patterns that merely share symptoms', () => {
    // progesterone_low and cortisol_high share anxiety and sleep_problems but agree on direction.
    const result = resolveHormoneAxisConflicts([
      clusterInsight('progesterone_low'),
      clusterInsight('cortisol_high'),
    ]);

    expect(result.filter((i) => i.category === 'mixed_signals')).toHaveLength(0);
    expect(result.every((i) => !i.demotedToMore)).toBe(true);
  });

  it('ignores insights that are not symptom clusters', () => {
    const unrelated: Insight = {
      ...clusterInsight('estrogen_low'),
      id: 'dose-1',
      category: 'dose_correlation',
      supportingData: {},
    };
    const result = resolveHormoneAxisConflicts([unrelated, clusterInsight('estrogen_high')]);

    expect(result.filter((i) => i.category === 'mixed_signals')).toHaveLength(0);
  });

  it('does not mutate the insights it is given', () => {
    const input = [clusterInsight('estrogen_low'), clusterInsight('estrogen_high')];
    const originalAction = input[0].actionSuggestion;

    resolveHormoneAxisConflicts(input);

    expect(input[0].actionSuggestion).toBe(originalAction);
    expect(input[0].demotedToMore).toBeUndefined();
  });
});
