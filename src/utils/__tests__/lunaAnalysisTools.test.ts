import { describe, expect, it } from 'vitest';
import {
  analyzeMedicationWindow,
  analyzeDoseTiming,
  analyzeRepeatedMedicationWindows,
  analysisResultKey,
  checkSufficiency,
  compareLabsWithSymptoms,
  compareMrsDomains,
  comparePeriods,
  compareSymptoms,
  identifyContradictoryEvidence,
  isMeaningfulAnalysisResult,
  loadRecentAnalysisRows,
  repeatedCooccurrences,
  type AnalysisCheckin,
} from '../../../supabase/functions/ai-assistant/analysisTools';

const patternedCheckins: AnalysisCheckin[] = [
  { checkin_date: '2026-01-01', total_score: 20, sleep_problems: 4, brain_fog: 4 },
  { checkin_date: '2026-01-08', total_score: 18, sleep_problems: 3, brain_fog: 3 },
  { checkin_date: '2026-01-15', total_score: 12, sleep_problems: 2, brain_fog: 2 },
  { checkin_date: '2026-01-22', total_score: 10, sleep_problems: 1, brain_fog: 1 },
  { checkin_date: '2026-01-29', total_score: 9, sleep_problems: 0, brain_fog: 0 },
  { checkin_date: '2026-02-05', total_score: 10, sleep_problems: 1, brain_fog: 1 },
];

describe('Luna deterministic analysis tools', () => {
  it('limits check-ins and labs newest-first, then restores chronological analysis order', async () => {
    const calls: Array<{ table: string; order?: [string, { ascending: boolean }]; limit?: number }> = [];
    const rows = {
      symptom_checkins: [
        { checkin_date: '2026-03-01' },
        { checkin_date: '2026-02-01' },
      ],
      lab_results: [
        { draw_date: '2026-03-02' },
        { draw_date: '2026-02-02' },
      ],
    };
    const client = {
      from(table: 'symptom_checkins' | 'lab_results') {
        const call: { table: string; order?: [string, { ascending: boolean }]; limit?: number } = { table };
        calls.push(call);
        const query = {
          select: () => query,
          eq: () => query,
          order: (column: string, options: { ascending: boolean }) => {
            call.order = [column, options];
            return query;
          },
          limit: (count: number) => {
            call.limit = count;
            return Promise.resolve({ data: rows[table], error: null });
          },
        };
        return query;
      },
    };

    const result = await loadRecentAnalysisRows(client, 'user-1');

    expect(calls).toEqual([
      { table: 'symptom_checkins', order: ['checkin_date', { ascending: false }], limit: 500 },
      { table: 'lab_results', order: ['draw_date', { ascending: false }], limit: 100 },
    ]);
    expect(result.checkins.map((row) => row.checkin_date)).toEqual(['2026-02-01', '2026-03-01']);
    expect(result.labs.map((row) => row.draw_date)).toEqual(['2026-02-02', '2026-03-02']);
  });

  it('detects a planted period change and exposes every number in tool evidence', () => {
    const result = comparePeriods({
      checkins: patternedCheckins,
      metric: 'total_score',
      firstStart: '2026-01-01',
      firstEnd: '2026-01-08',
      secondStart: '2026-01-15',
      secondEnd: '2026-01-22',
    });

    expect(result.sufficient).toBe(true);
    expect(result.evidenceClass).toBe('early_signal');
    expect(result.values).toMatchObject({
      firstAverage: 19,
      secondAverage: 11,
      delta: -8,
      firstCount: 2,
      secondCount: 2,
    });
    expect(result.summary).toContain('19');
    expect(result.summary).toContain('11');
    expect(result.summary).toContain('-8');
    expect(isMeaningfulAnalysisResult(result)).toBe(true);
  });

  it('keeps the recorded change date out of the before window', () => {
    const result = analyzeMedicationWindow({
      checkins: [
        { checkin_date: '2026-01-01', total_score: 20 },
        { checkin_date: '2026-01-08', total_score: 18 },
        { checkin_date: '2026-01-15', total_score: 12 },
        { checkin_date: '2026-01-22', total_score: 10 },
      ],
      metric: 'total_score',
      changeDate: '2026-01-15',
      beforeDays: 14,
      afterDays: 14,
    });

    expect(result.values.beforeCount).toBe(2);
    expect(result.values.afterCount).toBe(2);
    expect(result.values.beforeAverage).toBe(19);
    expect(result.values.afterAverage).toBe(11);
  });

  it('requires the same direction around independently recorded medication changes', () => {
    const result = analyzeRepeatedMedicationWindows({
      checkins: [
        { checkin_date: '2026-01-01', sleep_problems: 4 },
        { checkin_date: '2026-01-05', sleep_problems: 4 },
        { checkin_date: '2026-01-10', sleep_problems: 2 },
        { checkin_date: '2026-01-14', sleep_problems: 2 },
        { checkin_date: '2026-03-01', sleep_problems: 3 },
        { checkin_date: '2026-03-05', sleep_problems: 3 },
        { checkin_date: '2026-03-10', sleep_problems: 1 },
        { checkin_date: '2026-03-14', sleep_problems: 1 },
      ],
      metric: 'sleep_problems',
      medicationName: 'Example patch',
      changeDates: ['2026-01-10', '2026-03-10'],
      beforeDays: 9,
      afterDays: 7,
    });

    expect(result.evidenceClass).toBe('early_signal');
    expect(result.values).toMatchObject({
      recordedChangeCount: 2,
      matchingDirectionCount: 2,
      direction: 'lower',
    });
  });

  it('requires actual administration variation before showing a dose-timing signal', () => {
    const result = analyzeDoseTiming({
      medicationName: 'Example injection',
      metric: 'brain_fog',
      maxDays: 4,
      administrations: [
        { taken_at: '2026-06-01T08:00:00Z', local_date: '2026-06-01' },
        { taken_at: '2026-06-08T08:00:00Z', local_date: '2026-06-08' },
      ],
      checkins: [
        { checkin_date: '2026-06-01', brain_fog: 1 },
        { checkin_date: '2026-06-02', brain_fog: 2 },
        { checkin_date: '2026-06-03', brain_fog: 3 },
        { checkin_date: '2026-06-08', brain_fog: 1 },
        { checkin_date: '2026-06-09', brain_fog: 2 },
        { checkin_date: '2026-06-10', brain_fog: 3 },
      ],
    });

    expect(result.evidenceClass).toBe('early_signal');
    expect(result.values).toMatchObject({
      administrationCount: 2,
      distinctDayOffsets: 3,
      correlation: 1,
    });
  });

  it('detects a known repeated symptom pattern', () => {
    const comparison = compareSymptoms({
      checkins: patternedCheckins,
      firstMetric: 'sleep_problems',
      secondMetric: 'brain_fog',
    });
    const cooccurrence = repeatedCooccurrences({
      checkins: patternedCheckins,
      firstMetric: 'sleep_problems',
      secondMetric: 'brain_fog',
      threshold: 2,
    });

    expect(comparison.values.correlation).toBe(1);
    expect(isMeaningfulAnalysisResult(comparison)).toBe(true);
    expect(comparison.evidenceClass).toBe('early_signal');
    expect(cooccurrence.values).toMatchObject({
      matchCount: 3,
      comparableCount: 6,
      expectedMatchRate: 25,
      liftPoints: 25,
    });
    expect(isMeaningfulAnalysisResult(cooccurrence)).toBe(true);
  });

  it('rejects a deliberately planted false alignment', () => {
    const result = compareSymptoms({
      checkins: [
        { checkin_date: '2026-02-01', sleep_problems: 1, brain_fog: 1 },
        { checkin_date: '2026-02-08', sleep_problems: 2, brain_fog: 2 },
        { checkin_date: '2026-02-15', sleep_problems: 1, brain_fog: 2 },
        { checkin_date: '2026-02-22', sleep_problems: 2, brain_fog: 1 },
      ],
      firstMetric: 'sleep_problems',
      secondMetric: 'brain_fog',
    });

    expect(result.values.correlation).toBe(0);
    expect(isMeaningfulAnalysisResult(result)).toBe(false);
  });

  it('reports sparse data as insufficient rather than a finding', () => {
    const result = comparePeriods({
      checkins: [
        { checkin_date: '2026-03-01', total_score: 18 },
        { checkin_date: '2026-03-15', total_score: 12 },
      ],
      metric: 'total_score',
      firstStart: '2026-03-01',
      firstEnd: '2026-03-07',
      secondStart: '2026-03-15',
      secondEnd: '2026-03-21',
    });

    expect(result.sufficient).toBe(false);
    expect(result.evidenceClass).toBe('worth_watching');
    expect(isMeaningfulAnalysisResult(result)).toBe(false);
    expect(result.limitations.join(' ')).toMatch(/at least two/i);
  });

  it('preserves uncertainty for sparse laboratory comparisons and contradictory evidence', () => {
    const labResult = compareLabsWithSymptoms({
      labs: [
        { draw_date: '2026-01-01', estradiol: 20 },
        { draw_date: '2026-02-01', estradiol: 30 },
      ],
      checkins: [
        { checkin_date: '2026-01-02', total_score: 20 },
        { checkin_date: '2026-02-02', total_score: 18 },
      ],
      biomarker: 'estradiol',
      metric: 'total_score',
    });
    const contradiction = identifyContradictoryEvidence({
      results: [
        { ...checkSufficiency({ observationCount: 5, requiredCount: 4, label: 'A' }), values: { delta: 2 } },
        { ...checkSufficiency({ observationCount: 5, requiredCount: 4, label: 'B' }), values: { delta: -3 } },
      ],
    });

    expect(labResult.sufficient).toBe(false);
    expect(isMeaningfulAnalysisResult(labResult)).toBe(false);
    expect(contradiction.values.contradictory).toBe(true);
    expect(contradiction.evidenceClass).toBe('repeated_finding');
  });

  it('uses metric-specific effect thresholds instead of one delta for every scale', () => {
    const rows: AnalysisCheckin[] = [
      { checkin_date: '2026-04-01', total_score: 20, sleep_problems: 2 },
      { checkin_date: '2026-04-02', total_score: 20, sleep_problems: 2 },
      { checkin_date: '2026-04-15', total_score: 21, sleep_problems: 3 },
      { checkin_date: '2026-04-16', total_score: 21, sleep_problems: 3 },
    ];
    const total = comparePeriods({
      checkins: rows,
      metric: 'total_score',
      firstStart: '2026-04-01',
      firstEnd: '2026-04-02',
      secondStart: '2026-04-15',
      secondEnd: '2026-04-16',
    });
    const symptom = comparePeriods({
      checkins: rows,
      metric: 'sleep_problems',
      firstStart: '2026-04-01',
      firstEnd: '2026-04-02',
      secondStart: '2026-04-15',
      secondEnd: '2026-04-16',
    });

    expect(total.evidenceClass).toBe('suppressed');
    expect(symptom.evidenceClass).toBe('early_signal');
  });

  it('detects a stable MRS total that conceals opposing domains', () => {
    const result = compareMrsDomains({
      checkins: [
        { checkin_date: '2026-05-01', total_score: 12, somatic_score: 5, psychological_score: 4, urogenital_score: 3 },
        { checkin_date: '2026-05-02', total_score: 12, somatic_score: 5, psychological_score: 4, urogenital_score: 3 },
        { checkin_date: '2026-05-15', total_score: 12, somatic_score: 3, psychological_score: 4, urogenital_score: 5 },
        { checkin_date: '2026-05-16', total_score: 12, somatic_score: 3, psychological_score: 4, urogenital_score: 5 },
      ],
      firstStart: '2026-05-01',
      firstEnd: '2026-05-02',
      secondStart: '2026-05-15',
      secondEnd: '2026-05-16',
    });

    expect(result.evidenceClass).toBe('early_signal');
    expect(result.values).toMatchObject({
      totalDelta: 0,
      somaticDelta: -2,
      psychologicalDelta: 0,
      urogenitalDelta: 2,
    });
    expect(isMeaningfulAnalysisResult(result)).toBe(true);
  });

  it('derives candidate identity from evidence and parameters, not result order or wording', () => {
    const result = comparePeriods({
      checkins: patternedCheckins,
      metric: 'total_score',
      firstStart: '2026-01-01',
      firstEnd: '2026-01-08',
      secondStart: '2026-01-15',
      secondEnd: '2026-01-22',
    });
    const rewritten = { ...result, summary: 'Different Luna wording', evidence: [...result.evidence].reverse() };

    expect(analysisResultKey(rewritten)).toBe(analysisResultKey(result));
    expect(analysisResultKey({
      ...result,
      identity: {
        ...result.identity,
        parameters: { ...result.identity.parameters, secondEnd: '2026-01-29' },
      },
    })).not.toBe(analysisResultKey(result));
  });
});
