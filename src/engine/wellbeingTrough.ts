import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import type { Medication, MedicationAdministration } from '../types/database';
import { getDoseCycleDays } from '../utils/medicationHelpers';
import {
  addDaysISO,
  daysBetweenISO,
  resolveEventLocalDate,
  todayISO,
} from '../utils/localDate';
import { confidenceFromBeforeAfter } from './confidence';
import {
  type WellbeingSignalInput,
  TROUGH_LOOKBACK_DAYS,
  TROUGH_MIN_CYCLES,
  TROUGH_MIN_AVG_POINTS_PER_POSITION,
  TROUGH_MIN_GAP,
  TROUGH_MIN_ADMINISTRATIONS,
  dailySignalSeries,
  daysBetween,
  mean,
  round1,
} from './wellbeingShared';

function meanAdminIntervalDays(admins: MedicationAdministration[]): number | null {
  if (admins.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < admins.length; i++) {
    const gap =
      (new Date(admins[i].taken_at).getTime() - new Date(admins[i - 1].taken_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (gap > 0 && gap < 90) intervals.push(gap);
  }
  if (intervals.length === 0) return null;
  return mean(intervals);
}

function buildTroughInsight(
  med: Medication,
  endMean: number,
  bestMean: number,
  completeCycles: number,
  adminAnchored: boolean,
  positionMeans: number[],
): Insight {
  const anchorNote = adminAnchored ? ', based on your logged doses' : '';
  const coreBody = `Across your recent pulses, your average daily energy on the last day of your ${med.medication_name} cycle was ${round1(
    endMean,
  ).toFixed(1)}, compared with a best-day average of ${round1(bestMean).toFixed(
    1,
  )}${anchorNote}. This end-of-cycle dip held across about ${completeCycles} cycles.`;
  const mid = Math.floor(positionMeans.length / 2);
  const beforeMeans = positionMeans.slice(0, mid);
  const afterMeans = positionMeans.slice(mid);
  return {
    id: `wb-trough-${med.id}`,
    category: 'wellbeing_signal',
    priority: 'medium',
    title: `Your energy readings dip at the end of your ${med.medication_name} cycle`,
    body: finalizeInsightBody(coreBody, { n: completeCycles }, true),
    sampleSize: { n: completeCycles },
    confidence: confidenceFromBeforeAfter(
      beforeMeans,
      afterMeans,
      bestMean - endMean,
      TROUGH_LOOKBACK_DAYS,
      TROUGH_MIN_CYCLES,
      { n: completeCycles },
    ),
    supportingData: {},
    relatedMedication: med.id,
    actionSuggestion:
      'End-of-cycle dips are a recognized pattern worth raising with your provider — dosing interval and delivery method are common levers.',
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

function analyzeTroughFromPositions(
  med: Medication,
  usable: Array<{ date: string; value: number }>,
  cycleDays: number,
  getPosition: (point: { date: string; value: number }) => number | null,
  completeCycles: number,
  adminAnchored: boolean,
): Insight | null {
  const bucketCount = Math.max(2, Math.round(cycleDays));
  const byPos = new Map<number, number[]>();

  for (const p of usable) {
    const rawPos = getPosition(p);
    if (rawPos === null) continue;
    const pos = Math.min(bucketCount - 1, Math.max(0, Math.floor(rawPos)));
    const arr = byPos.get(pos) ?? [];
    arr.push(p.value);
    byPos.set(pos, arr);
  }

  const totalPoints = usable.length;
  const avgPerPos = totalPoints / bucketCount;
  if (avgPerPos < TROUGH_MIN_AVG_POINTS_PER_POSITION) return null;

  const means: Array<{ pos: number; mean: number }> = [];
  for (let pos = 0; pos < bucketCount; pos++) {
    const vals = byPos.get(pos) ?? [];
    if (vals.length === 0) continue;
    const m = mean(vals);
    if (m === null) continue;
    means.push({ pos, mean: m });
  }
  if (means.length < bucketCount) return null;

  const best = means.reduce((a, b) => (b.mean > a.mean ? b : a));
  const endPos = bucketCount - 1;
  const endMean = means.find((m) => m.pos === endPos)?.mean;
  if (endMean === undefined) return null;
  if (best.mean - endMean < TROUGH_MIN_GAP) return null;

  return buildTroughInsight(
    med,
    endMean,
    best.mean,
    completeCycles,
    adminAnchored,
    means.map((m) => m.mean),
  );
}

function troughInsightForMed(
  med: Medication,
  recent: Array<{ date: string; value: number }>,
  administrations: MedicationAdministration[],
  timezone: string,
): Insight | null {
  const windowStart = addDaysISO(
    recent[recent.length - 1]?.date ?? todayISO(timezone),
    -TROUGH_LOOKBACK_DAYS,
  );
  const medAdmins = administrations
    .filter(
      (a) =>
        a.medication_id === med.id &&
        resolveEventLocalDate(a.taken_at, a.local_date, a.event_timezone, timezone) >= windowStart,
    )
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at));

  if (medAdmins.length >= TROUGH_MIN_ADMINISTRATIONS) {
    const cycleDays = meanAdminIntervalDays(medAdmins);
    if (cycleDays && cycleDays >= 1) {
      const firstAdminDate = resolveEventLocalDate(
        medAdmins[0].taken_at,
        medAdmins[0].local_date,
        medAdmins[0].event_timezone,
        timezone,
      );
      const usable = recent.filter((p) => p.date >= firstAdminDate);
      if (usable.length >= cycleDays * TROUGH_MIN_CYCLES) {
        const spanDays = daysBetweenISO(firstAdminDate, usable[usable.length - 1].date);
        const completeCycles = Math.floor(spanDays / cycleDays);
        if (completeCycles >= TROUGH_MIN_CYCLES) {
          const insight = analyzeTroughFromPositions(
            med,
            usable,
            cycleDays,
            (p) => {
              const adminsBefore = medAdmins.filter(
                (a) =>
                  resolveEventLocalDate(
                    a.taken_at,
                    a.local_date,
                    a.event_timezone,
                    timezone,
                  ) <= p.date,
              );
              if (adminsBefore.length === 0) return null;
              const lastAdmin = adminsBefore[adminsBefore.length - 1];
              const lastAdminDate = resolveEventLocalDate(
                lastAdmin.taken_at,
                lastAdmin.local_date,
                lastAdmin.event_timezone,
                timezone,
              );
              const daysSince = daysBetweenISO(lastAdminDate, p.date);
              return ((daysSince % cycleDays) + cycleDays) % cycleDays;
            },
            completeCycles,
            true,
          );
          if (insight) return insight;
        }
      }
    }
  }

  const scheduleCycleDays = getDoseCycleDays(med);
  if (!scheduleCycleDays) return null;

  const startDate = (med.start_date as unknown as string | null | undefined) ?? null;
  if (!startDate) return null;

  const usable = recent.filter((p) => p.date >= startDate);
  if (usable.length < scheduleCycleDays * TROUGH_MIN_CYCLES) return null;

  const spanDays = daysBetween(startDate, usable[usable.length - 1].date);
  const completeCycles = Math.floor(spanDays / scheduleCycleDays);
  if (completeCycles < TROUGH_MIN_CYCLES) return null;

  return analyzeTroughFromPositions(
    med,
    usable,
    scheduleCycleDays,
    (p) => ((daysBetween(startDate, p.date) % scheduleCycleDays) + scheduleCycleDays) % scheduleCycleDays,
    completeCycles,
    false,
  );
}

export function troughInsights(input: WellbeingSignalInput): Insight[] {
  const points = dailySignalSeries(input.checkins);
  if (points.length < 20) return [];

  const today = points[points.length - 1].date;
  const start = addDaysISO(today, -TROUGH_LOOKBACK_DAYS);
  const recent = points.filter((p) => p.date >= start);

  const insights: Insight[] = [];

  for (const med of input.medications.filter((m) => m.is_active)) {
    const insight = troughInsightForMed(med, recent, input.administrations, input.timezone);
    if (insight) insights.push(insight);
  }

  return insights;
}
