import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin, Medication, LabResult } from '../types/database';
import { MRS_CORE_SYMPTOMS } from '../data/symptoms';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { hasMRSData } from '../utils/checkinHelpers';
import { formatDateLong } from '../utils/formatters';
import { formatMedicationDoseShort } from '../utils/medicationHelpers';
import { todayISO } from '../utils/localDate';
import { computeInsightConfidence, confidenceFromBeforeAfter } from './confidence';
import { pooledStdDev } from './engineStats';

interface TrendInput {
  checkins: SymptomCheckin[];
  medications: Medication[];
  labResults: LabResult[];
}

function getMonthsSince(dateStr: string): number {
  const then = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  let months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
  if (now.getDate() < then.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCheckinSequence(values: number[]): string {
  return values
    .map((value, index) =>
      index === values.length - 1
        ? `and ${value} on the most recent`
        : `${value} on check-in ${index + 1}`,
    )
    .join(', ');
}

export function analyzeTrends(input: TrendInput): Insight[] {
  const insights: Insight[] = [];
  const { checkins, medications, labResults } = input;

  const sorted = [...checkins].filter(hasMRSData).sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  if (sorted.length < 3) return insights;

  const thirdLen = Math.max(2, Math.floor(sorted.length / 3));
  const earlyCheckins = sorted.slice(0, thirdLen);
  const lateCheckins = sorted.slice(-thirdLen);

  const earlyAvg = earlyCheckins.reduce((s, c) => s + c.total_score, 0) / earlyCheckins.length;
  const lateAvg = lateCheckins.reduce((s, c) => s + c.total_score, 0) / lateCheckins.length;
  const overallDelta = lateAvg - earlyAvg;
  const periodSampleSize = {
    before: earlyCheckins.length,
    after: lateCheckins.length,
  };

  if (overallDelta <= -5) {
    insights.push({
      id: 'trend-overall-improving',
      category: 'positive_trend',
      priority: 'positive',
      title: 'Your overall symptom scores are lower than when you started tracking',
      body: finalizeInsightBody(
        `Your average MRS total was ${Math.round(earlyAvg)} across your earliest logged check-ins and ${Math.round(lateAvg)} across your most recent — a ${Math.abs(Math.round(overallDelta))}-point difference over your tracking period.`,
        periodSampleSize,
        false,
      ),
      sampleSize: periodSampleSize,
      confidence: confidenceFromBeforeAfter(
        earlyCheckins.map((c) => c.total_score),
        lateCheckins.map((c) => c.total_score),
        overallDelta,
        Math.max(
          14,
          daysBetween(sorted[0].checkin_date, sorted[sorted.length - 1].checkin_date),
        ),
        thirdLen,
        periodSampleSize,
      ),
      supportingData: {
        trendData: sorted.map((c) => ({ date: c.checkin_date, score: c.total_score })),
      },
      actionSuggestion:
        'Positive trends are worth sharing with your provider when you review your history together.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  } else if (overallDelta >= 5) {
    insights.push({
      id: 'trend-overall-worsening',
      category: 'trend_alert',
      priority: 'high',
      title: 'Your overall symptom scores are higher than when you started tracking',
      body: finalizeInsightBody(
        `Your average MRS total was ${Math.round(earlyAvg)} across your earliest logged check-ins and ${Math.round(lateAvg)} across your most recent — a ${Math.round(overallDelta)}-point difference over your tracking period.`,
        periodSampleSize,
        false,
      ),
      sampleSize: periodSampleSize,
      confidence: confidenceFromBeforeAfter(
        earlyCheckins.map((c) => c.total_score),
        lateCheckins.map((c) => c.total_score),
        overallDelta,
        Math.max(
          14,
          daysBetween(sorted[0].checkin_date, sorted[sorted.length - 1].checkin_date),
        ),
        thirdLen,
        periodSampleSize,
      ),
      supportingData: {
        trendData: sorted.map((c) => ({ date: c.checkin_date, score: c.total_score })),
      },
      actionSuggestion:
        'Consider scheduling an appointment with your provider to review your symptom history.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  for (const symptom of MRS_CORE_SYMPTOMS) {
    const key = symptom.key as MRSSymptomKey;
    const values = sorted
      .map((c) => c[key])
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .map((v) => Number(v));

    if (values.length < 4) continue;

    const lastFour = values.slice(-4);
    const isWorsening =
      lastFour.every((v, i) => i === 0 || v >= lastFour[i - 1]) &&
      lastFour[3] > lastFour[0] &&
      lastFour[3] >= 3;
    const isImproving =
      lastFour.every((v, i) => i === 0 || v <= lastFour[i - 1]) &&
      lastFour[3] < lastFour[0] &&
      lastFour[0] >= 2;

    const fourCheckinSample = { n: 4 };

    if (isWorsening) {
      insights.push({
        id: `trend-worsening-${symptom.key}`,
        category: 'trend_alert',
        priority: 'medium',
        title: `${symptom.label} scores have been rising across recent check-ins`,
        body: finalizeInsightBody(
          `Your ${symptom.label.toLowerCase()} ratings were ${formatCheckinSequence(lastFour)} across your last four scored check-ins.`,
          fourCheckinSample,
          false,
        ),
        sampleSize: fourCheckinSample,
        confidence: computeInsightConfidence({
          sampleFloor: 4,
          sampleCount: 4,
          delta: lastFour[3] - lastFour[0],
          pooledStdDev: pooledStdDev(lastFour.slice(0, 2), lastFour.slice(2)),
          windowDays: 28,
          actualInWindow: 4,
          sampleSize: fourCheckinSample,
        }),
        supportingData: {
          trendData: sorted.map((c) => ({
            date: c.checkin_date,
            score: c[key] as number,
          })),
        },
        relatedSymptoms: [symptom.key],
        actionSuggestion: `If ${symptom.label.toLowerCase()} stays elevated, discuss with your provider.${symptom.relatedHormones?.length ? ` This symptom is commonly associated with: ${symptom.relatedHormones.join(', ').replace(/_/g, ' ')}.` : ''}`,
        disclaimer: INSIGHT_DISCLAIMER,
        generatedAt: new Date().toISOString(),
      });
    }

    if (isImproving) {
      insights.push({
        id: `trend-improving-${symptom.key}`,
        category: 'positive_trend',
        priority: 'positive',
        title: `${symptom.label} scores have been falling across recent check-ins`,
        body: finalizeInsightBody(
          `Your ${symptom.label.toLowerCase()} ratings were ${formatCheckinSequence(lastFour)} across your last four scored check-ins.`,
          fourCheckinSample,
          false,
        ),
        sampleSize: fourCheckinSample,
        confidence: computeInsightConfidence({
          sampleFloor: 4,
          sampleCount: 4,
          delta: lastFour[0] - lastFour[3],
          pooledStdDev: pooledStdDev(lastFour.slice(0, 2), lastFour.slice(2)),
          windowDays: 28,
          actualInWindow: 4,
          sampleSize: fourCheckinSample,
        }),
        supportingData: {
          trendData: sorted.map((c) => ({
            date: c.checkin_date,
            score: c[key] as number,
          })),
        },
        relatedSymptoms: [symptom.key],
        actionSuggestion: 'Keep logging — sustained patterns are easier to review with your provider.',
        disclaimer: INSIGHT_DISCLAIMER,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const med of medications.filter((m) => m.is_active)) {
    const startDate = new Date(med.start_date + 'T12:00:00');
    if (startDate > sixMonthsAgo) continue;

    const recentAvg = lateCheckins.reduce((s, c) => s + c.total_score, 0) / lateCheckins.length;
    if (recentAvg < 20) continue;

    const medSampleSize = { n: lateCheckins.length };
    insights.push({
      id: `stale-med-${med.id}`,
      category: 'medication_note',
      priority: 'low',
      title: `${med.medication_name} has been at the same dose for ${getMonthsSince(med.start_date)} months`,
      body: finalizeInsightBody(
        `You've been taking ${med.medication_name} (${formatMedicationDoseShort(med)}) since ${formatDateLong(med.start_date)} without a dose adjustment. Your recent MRS average is ${Math.round(recentAvg)}/44 across your latest logged check-ins.`,
        medSampleSize,
        true,
      ),
      sampleSize: medSampleSize,
      confidence: computeInsightConfidence({
        sampleFloor: 2,
        sampleCount: lateCheckins.length,
        delta: recentAvg,
        pooledStdDev: 8,
        windowDays: 90,
        actualInWindow: lateCheckins.length,
        sampleSize: medSampleSize,
      }),
      supportingData: {},
      relatedMedication: med.id,
      actionSuggestion:
        'Ask your provider: "I have been on this dose for several months. Should we consider adjusting?"',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  const today = todayISO();
  if (labResults.length === 0) {
    insights.push({
      id: 'lab-due-none',
      category: 'lab_due',
      priority: 'low',
      title: 'No lab results on file yet',
      body: finalizeInsightBody(
        'Adding blood work helps the app compare your symptoms with your hormone levels and note when labs and symptoms tell different stories.',
        { n: 0 },
        true,
      ),
      sampleSize: { n: 0 },
      confidence: computeInsightConfidence({
        sampleFloor: 1,
        sampleCount: 0,
        delta: 0,
        pooledStdDev: 1,
        windowDays: 7,
        actualInWindow: 0,
        sampleSize: { n: 0 },
      }),
      supportingData: {},
      actionSuggestion: 'Add your most recent lab results under Labs when you have them.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  } else {
    const latestLab = [...labResults].sort((a, b) => b.draw_date.localeCompare(a.draw_date))[0];
    const daysSinceLabs = daysBetween(latestLab.draw_date, today);
    const weeksSince = Math.floor(daysSinceLabs / 7);

    if (weeksSince >= 12) {
      insights.push({
        id: 'lab-due-reminder',
        category: 'lab_due',
        priority: 'low',
        title: `It's been ${weeksSince} weeks since your last labs`,
        body: finalizeInsightBody(
          `Your most recent draw was on ${formatDateLong(latestLab.draw_date)}. Regular labs help you and your provider see how your levels line up with your symptoms over time.`,
          { n: labResults.length },
          true,
        ),
        sampleSize: { n: labResults.length },
        confidence: computeInsightConfidence({
          sampleFloor: 1,
          sampleCount: labResults.length,
          delta: weeksSince,
          pooledStdDev: 12,
          windowDays: weeksSince * 7,
          actualInWindow: labResults.length,
          sampleSize: { n: labResults.length },
        }),
        supportingData: {},
        relatedLabs: ['estradiol'],
        actionSuggestion:
          'Ask your provider when your next labs are scheduled and add results here once you have them.',
        disclaimer: INSIGHT_DISCLAIMER,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  return insights;
}
