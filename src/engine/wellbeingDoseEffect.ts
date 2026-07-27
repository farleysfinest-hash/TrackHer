import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import { getMedicationChangeLabel } from '../utils/medicationHelpers';
import {
  collectBeforeAfterWindows,
  passesScalarDoseEffectFloor,
  windowWeeksLabel,
} from './engineStats';
import { confidenceFromBeforeAfter } from './confidence';
import { conflictWindowForChange } from './conflictResolution';
import {
  type WellbeingSignalInput,
  WELLBEING_DOSE_MIN_POINTS,
  dailySignalSeries,
  mean,
  round1,
} from './wellbeingShared';

export function doseChangeWellbeingInsights(input: WellbeingSignalInput): Insight[] {
  const { checkins, medicationChanges, medications } = input;
  const points = dailySignalSeries(checkins);
  if (points.length < 2) return [];

  const insights: Insight[] = [];

  for (const change of medicationChanges) {
    const medication = medications.find((m) => m.id === change.medication_id);
    if (!medication) continue;

    const datedPoints = points.map((p) => ({ ...p, checkin_date: p.date }));
    const windows = collectBeforeAfterWindows(
      datedPoints,
      change.change_date,
      WELLBEING_DOSE_MIN_POINTS,
    );
    if (!windows) continue;

    const { windowDays, before: beforeDated, after: afterDated } = windows;
    const before = beforeDated.map(({ date, value }) => ({ date, value }));
    const after = afterDated.map(({ date, value }) => ({ date, value }));

    const beforeValues = before.map((p) => p.value);
    const afterValues = after.map((p) => p.value);

    const avgBefore = mean(beforeValues);
    const avgAfter = mean(afterValues);
    if (avgBefore === null || avgAfter === null) continue;

    const diff = avgAfter - avgBefore;
    if (!passesScalarDoseEffectFloor(beforeValues, afterValues, diff, 1.0)) {
      continue;
    }

    const scoresHigherAfter = diff > 0;
    const changeLabel = getMedicationChangeLabel(change, medication);
    const weeksLabel = windowWeeksLabel(windowDays);

    const title = scoresHigherAfter
      ? `Your daily energy readings were higher in the ${weeksLabel} following your ${changeLabel} than in the ${weeksLabel} before`
      : `Your daily energy readings were lower in the ${weeksLabel} following your ${changeLabel} than in the ${weeksLabel} before`;

    const coreBody = `In the ${weeksLabel} before your ${changeLabel} on ${change.change_date}, your average daily energy was ${round1(
      avgBefore,
    ).toFixed(1)}. In the ${weeksLabel} following, it averaged ${round1(avgAfter).toFixed(1)}.`;

    const sampleSize = { before: before.length, after: after.length };
    const conflictWindow = conflictWindowForChange(change.change_date, windowDays);

    insights.push({
      id: `wb-dose-${change.id}`,
      category: 'wellbeing_signal',
      priority: scoresHigherAfter ? 'positive' : 'medium',
      title,
      body: finalizeInsightBody(coreBody, sampleSize, true),
      sampleSize,
      confidence: confidenceFromBeforeAfter(
        beforeValues,
        afterValues,
        diff,
        windowDays,
        WELLBEING_DOSE_MIN_POINTS,
        sampleSize,
      ),
      conflict: {
        medicationChangeId: change.id,
        ...conflictWindow,
        direction: scoresHigherAfter ? 'improvement' : 'worsening',
      },
      supportingData: {},
      relatedMedication: medication.id,
      actionSuggestion: scoresHigherAfter
        ? 'If this matches how you feel, keep logging daily pulses to see whether the pattern holds.'
        : 'If this matches how you feel, consider discussing it with your provider.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}
