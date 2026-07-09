import type { Insight } from './types';
import { INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin, MedicationChange, Medication } from '../types/database';
import { MRS_CORE_SYMPTOMS } from '../data/symptoms';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { hasMRSData } from '../utils/checkinHelpers';
import { getMedicationChangeLabel } from '../utils/medicationHelpers';

interface DoseCorrelationInput {
  checkins: SymptomCheckin[];
  medicationChanges: MedicationChange[];
  medications: Medication[];
}

const WINDOW_DAYS = 21;
const MIN_CHECKINS_PER_WINDOW = 2;

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${month}-${day}`;
}

export function analyzeDoseCorrelations(input: DoseCorrelationInput): Insight[] {
  const insights: Insight[] = [];
  const { checkins, medicationChanges, medications } = input;
  const mrsCheckins = checkins.filter(hasMRSData);

  if (mrsCheckins.length < 2) return [];

  for (const change of medicationChanges) {
    const medication = medications.find((m) => m.id === change.medication_id);
    if (!medication) continue;

    const beforeStart = addDays(change.change_date, -WINDOW_DAYS);
    const afterEnd = addDays(change.change_date, WINDOW_DAYS);

    const beforeCheckins = mrsCheckins.filter(
      (c) => c.checkin_date >= beforeStart && c.checkin_date < change.change_date,
    );
    const afterCheckins = mrsCheckins.filter(
      (c) => c.checkin_date > change.change_date && c.checkin_date <= afterEnd,
    );

    if (
      beforeCheckins.length < MIN_CHECKINS_PER_WINDOW ||
      afterCheckins.length < MIN_CHECKINS_PER_WINDOW
    ) {
      continue;
    }

    const avgBefore =
      beforeCheckins.reduce((sum, c) => sum + c.total_score, 0) / beforeCheckins.length;
    const avgAfter =
      afterCheckins.reduce((sum, c) => sum + c.total_score, 0) / afterCheckins.length;
    const totalDelta = avgAfter - avgBefore;

    const symptomDeltas: Insight['supportingData']['symptomScores'] = [];

    for (const symptom of MRS_CORE_SYMPTOMS) {
      const key = symptom.key as MRSSymptomKey;
      const symBefore =
        beforeCheckins
          .map((c) => Number(c[key] ?? 0))
          .reduce((a, b) => a + b, 0) / beforeCheckins.length;
      const symAfter =
        afterCheckins.map((c) => Number(c[key] ?? 0)).reduce((a, b) => a + b, 0) /
        afterCheckins.length;
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

    if (Math.abs(totalDelta) < 3) continue;

    symptomDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const improved = totalDelta < 0;
    const changeLabel = getMedicationChangeLabel(change, medication);
    const topChanges = symptomDeltas.slice(0, 3);
    const changesText = topChanges
      .map((s) => {
        const direction = s.delta < 0 ? 'improved' : 'worsened';
        return `${s.label} ${direction} (${s.avgBefore.toFixed(1)} → ${s.avgAfter.toFixed(1)})`;
      })
      .join('; ');

    const title = improved
      ? `Symptoms improved after ${changeLabel}`
      : `Symptoms worsened after ${changeLabel}`;

    const body = improved
      ? `In the ${WINDOW_DAYS} days following your ${changeLabel}, your overall symptom score decreased by ${Math.abs(Math.round(totalDelta))} points (from ${Math.round(avgBefore)} to ${Math.round(avgAfter)}). Notable changes: ${changesText}.`
      : `In the ${WINDOW_DAYS} days following your ${changeLabel}, your overall symptom score increased by ${Math.round(totalDelta)} points (from ${Math.round(avgBefore)} to ${Math.round(avgAfter)}). Notable changes: ${changesText}. Consider discussing this with your provider.`;

    insights.push({
      id: `dose-corr-${change.id}`,
      category: 'dose_correlation',
      priority: improved ? 'positive' : 'high',
      title,
      body,
      supportingData: {
        beforePeriod: {
          startDate: beforeStart,
          endDate: change.change_date,
          avgScore: Math.round(avgBefore),
        },
        afterPeriod: {
          startDate: change.change_date,
          endDate: afterEnd,
          avgScore: Math.round(avgAfter),
        },
        symptomScores: symptomDeltas,
      },
      relatedMedication: medication.id,
      relatedSymptoms: symptomDeltas.map((s) => s.symptomKey),
      actionSuggestion: improved
        ? 'This change appears to be helping. Continue monitoring.'
        : 'Discuss this pattern with your healthcare provider at your next appointment.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}
