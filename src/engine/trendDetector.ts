import type { Insight } from './types';
import { INSIGHT_DISCLAIMER } from './types';
import type { SymptomCheckin, Medication, LabResult } from '../types/database';
import { MRS_CORE_SYMPTOMS } from '../data/symptoms';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { hasMRSData } from '../utils/checkinHelpers';
import { formatDateLong } from '../utils/formatters';
import { formatMedicationDoseShort } from '../utils/medicationHelpers';

interface TrendInput {
  checkins: SymptomCheckin[];
  medications: Medication[];
  labResults: LabResult[];
}

function getMonthsSince(dateStr: string): number {
  const then = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
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

  if (overallDelta <= -5) {
    insights.push({
      id: 'trend-overall-improving',
      category: 'positive_trend',
      priority: 'positive',
      title: 'Your symptoms are trending in the right direction',
      body: `Your overall symptom score has decreased from an average of ${Math.round(earlyAvg)} to ${Math.round(lateAvg)} over your tracking period — a ${Math.abs(Math.round(overallDelta))}-point improvement. Your current regimen appears to be helping.`,
      supportingData: {
        trendData: sorted.map((c) => ({ date: c.checkin_date, score: c.total_score })),
      },
      actionSuggestion:
        'Continue your current regimen and keep tracking. Positive trends are worth sharing with your provider.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  } else if (overallDelta >= 5) {
    insights.push({
      id: 'trend-overall-worsening',
      category: 'trend_alert',
      priority: 'high',
      title: 'Your symptoms have been gradually worsening',
      body: `Your overall symptom score has increased from an average of ${Math.round(earlyAvg)} to ${Math.round(lateAvg)} — a ${Math.round(overallDelta)}-point increase over your tracking period. This could indicate that your current regimen needs adjustment, or that other factors are affecting your symptoms.`,
      supportingData: {
        trendData: sorted.map((c) => ({ date: c.checkin_date, score: c.total_score })),
      },
      actionSuggestion:
        'Consider scheduling an appointment with your provider to review your current hormone therapy.',
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

    if (isWorsening) {
      insights.push({
        id: `trend-worsening-${symptom.key}`,
        category: 'trend_alert',
        priority: 'medium',
        title: `${symptom.label} has been getting worse`,
        body: `Your ${symptom.label.toLowerCase()} severity has increased over your last 4 check-ins (${lastFour.join(' → ')}). This sustained worsening may warrant attention.`,
        supportingData: {
          trendData: sorted.map((c) => ({
            date: c.checkin_date,
            score: Number(c[key] ?? 0),
          })),
        },
        relatedSymptoms: [symptom.key],
        actionSuggestion: `If ${symptom.label.toLowerCase()} continues worsening, discuss with your provider.${symptom.relatedHormones?.length ? ` This symptom is commonly associated with: ${symptom.relatedHormones.join(', ').replace(/_/g, ' ')}.` : ''}`,
        disclaimer: INSIGHT_DISCLAIMER,
        generatedAt: new Date().toISOString(),
      });
    }

    if (isImproving) {
      insights.push({
        id: `trend-improving-${symptom.key}`,
        category: 'positive_trend',
        priority: 'positive',
        title: `${symptom.label} is improving`,
        body: `Your ${symptom.label.toLowerCase()} has decreased over your last 4 check-ins (${lastFour.join(' → ')}). Your current approach appears to be working for this symptom.`,
        supportingData: {
          trendData: sorted.map((c) => ({
            date: c.checkin_date,
            score: Number(c[key] ?? 0),
          })),
        },
        relatedSymptoms: [symptom.key],
        actionSuggestion: 'Keep it up. This positive trend is worth noting.',
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

    insights.push({
      id: `stale-med-${med.id}`,
      category: 'medication_note',
      priority: 'low',
      title: `${med.medication_name} has been at the same dose for ${getMonthsSince(med.start_date)} months`,
      body: `You've been taking ${med.medication_name} (${formatMedicationDoseShort(med)}) since ${formatDateLong(med.start_date)} without a dose adjustment, and your MRS score is still at ${Math.round(recentAvg)}/44. It may be worth discussing whether a dose change could help.`,
      supportingData: {},
      relatedMedication: med.id,
      actionSuggestion:
        'Ask your provider: "I have been on this dose for several months. Should we consider adjusting?"',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  const today = new Date().toISOString().split('T')[0];
  if (labResults.length === 0) {
    insights.push({
      id: 'lab-due-none',
      category: 'lab_due',
      priority: 'low',
      title: 'No lab results on file yet',
      body: 'Adding blood work helps the app compare your symptoms with your hormone levels and detect when labs and symptoms tell different stories.',
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
        body: `Your most recent draw was on ${formatDateLong(latestLab.draw_date)}. Regular labs help track whether your hormone therapy is reaching your target levels.`,
        supportingData: {},
        relatedLabs: ['estradiol'],
        actionSuggestion: 'Ask your provider when your next labs are due and add results here after your draw.',
        disclaimer: INSIGHT_DISCLAIMER,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  return insights;
}
