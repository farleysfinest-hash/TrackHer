import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin, MedicationChange, Medication, MRSScore } from '../types/database';
import { MRS_CORE_SYMPTOMS } from '../data/symptoms';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { hasMRSData } from '../utils/checkinHelpers';
import { getMedicationChangeLabel } from '../utils/medicationHelpers';
import {
  collectBeforeAfterWindows,
  passesMrsDoseEffectFloor,
  windowWeeksLabel,
} from './engineStats';
import { confidenceFromBeforeAfter } from './confidence';
import { conflictWindowForChange } from './conflictResolution';

interface DoseCorrelationInput {
  checkins: SymptomCheckin[];
  medicationChanges: MedicationChange[];
  medications: Medication[];
}

const MIN_CHECKINS_PER_WINDOW = 4;

export function analyzeDoseCorrelations(input: DoseCorrelationInput): Insight[] {
  const insights: Insight[] = [];
  const { checkins, medicationChanges, medications } = input;
  const mrsCheckins = checkins.filter(hasMRSData);

  if (mrsCheckins.length < MIN_CHECKINS_PER_WINDOW * 2) return [];

  for (const change of medicationChanges) {
    const medication = medications.find((m) => m.id === change.medication_id);
    if (!medication) continue;

    const windows = collectBeforeAfterWindows(
      mrsCheckins,
      change.change_date,
      MIN_CHECKINS_PER_WINDOW,
    );
    if (!windows) continue;

    const { windowDays, before: beforeCheckins, after: afterCheckins } = windows;

    const beforeScores = beforeCheckins.map((c) => c.total_score);
    const afterScores = afterCheckins.map((c) => c.total_score);

    const avgBefore =
      beforeScores.reduce((sum, score) => sum + score, 0) / beforeScores.length;
    const avgAfter =
      afterScores.reduce((sum, score) => sum + score, 0) / afterScores.length;
    const totalDelta = avgAfter - avgBefore;

    if (!passesMrsDoseEffectFloor(beforeScores, afterScores, totalDelta)) {
      continue;
    }

    const symptomDeltas: NonNullable<Insight['supportingData']['symptomScores']> = [];

    for (const symptom of MRS_CORE_SYMPTOMS) {
      const key = symptom.key as MRSSymptomKey;
      const symBeforeValues = beforeCheckins
        .map((c) => c[key])
        .filter((v): v is MRSScore => v !== null && v !== undefined);
      const symAfterValues = afterCheckins
        .map((c) => c[key])
        .filter((v): v is MRSScore => v !== null && v !== undefined);
      if (symBeforeValues.length === 0 || symAfterValues.length === 0) continue;

      const symBefore =
        symBeforeValues.reduce<number>((sum, v) => sum + v, 0) / symBeforeValues.length;
      const symAfter =
        symAfterValues.reduce<number>((sum, v) => sum + v, 0) / symAfterValues.length;
      const delta = symAfter - symBefore;

      if (Math.abs(delta) >= 0.5) {
        symptomDeltas.push({
          symptomKey: symptom.key,
          label: symptom.label,
          avgBefore: Math.round(symBefore * 10) / 10,
          avgAfter: Math.round(symAfter * 10) / 10,
          delta: Math.round(delta * 10) / 10,
        });
      }
    }

    symptomDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const scoresHigherAfter = totalDelta > 0;
    const changeLabel = getMedicationChangeLabel(change, medication);
    const weeksLabel = windowWeeksLabel(windowDays);
    const topChanges = symptomDeltas.slice(0, 3);
    const changesText =
      topChanges.length > 0
        ? topChanges
            .map(
              (s) =>
                `${s.label}: ${s.avgBefore.toFixed(1)} in the prior window, ${s.avgAfter.toFixed(1)} in the following window`,
            )
            .join('; ')
        : 'No individual symptom stood out beyond the overall shift.';

    const title = scoresHigherAfter
      ? `Your MRS scores were higher in the ${weeksLabel} following your ${changeLabel} than in the ${weeksLabel} before`
      : `Your MRS scores were lower in the ${weeksLabel} following your ${changeLabel} than in the ${weeksLabel} before`;

    const coreBody = scoresHigherAfter
      ? `Your average MRS total was ${Math.round(avgBefore)} in the ${weeksLabel} before your ${changeLabel}, and ${Math.round(avgAfter)} in the ${weeksLabel} following it — a difference of ${Math.round(totalDelta)} points. Notable symptom averages: ${changesText}.`
      : `Your average MRS total was ${Math.round(avgBefore)} in the ${weeksLabel} before your ${changeLabel}, and ${Math.round(avgAfter)} in the ${weeksLabel} following it — a difference of ${Math.round(Math.abs(totalDelta))} points. Notable symptom averages: ${changesText}.`;

    const sampleSize = {
      before: beforeCheckins.length,
      after: afterCheckins.length,
    };
    const conflictWindow = conflictWindowForChange(change.change_date, windowDays);

    insights.push({
      id: `dose-corr-${change.id}`,
      category: 'dose_correlation',
      priority: scoresHigherAfter ? 'high' : 'positive',
      title,
      body: finalizeInsightBody(coreBody, sampleSize, true),
      sampleSize,
      confidence: confidenceFromBeforeAfter(
        beforeScores,
        afterScores,
        totalDelta,
        windowDays,
        MIN_CHECKINS_PER_WINDOW,
        sampleSize,
      ),
      conflict: {
        medicationChangeId: change.id,
        ...conflictWindow,
        direction: scoresHigherAfter ? 'worsening' : 'improvement',
      },
      supportingData: {
        beforePeriod: {
          startDate: beforeCheckins[0]?.checkin_date ?? change.change_date,
          endDate: change.change_date,
          avgScore: Math.round(avgBefore),
        },
        afterPeriod: {
          startDate: change.change_date,
          endDate: afterCheckins[afterCheckins.length - 1]?.checkin_date ?? change.change_date,
          avgScore: Math.round(avgAfter),
        },
        symptomScores: symptomDeltas,
      },
      relatedMedication: medication.id,
      relatedSymptoms: symptomDeltas.map((s) => s.symptomKey),
      actionSuggestion: scoresHigherAfter
        ? 'Consider sharing this pattern with your healthcare provider at your next appointment.'
        : 'Continue logging to see whether this pattern holds across more check-ins.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}
