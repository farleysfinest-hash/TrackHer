import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';
import type { Medication, MedicationChange, SymptomCheckin, MedicationAdministration } from '../types/database';
import { getDoseCycleDays, getMedicationChangeLabel } from '../utils/medicationHelpers';
import {
  addDaysISO,
  daysBetweenISO,
  resolveEventLocalDate,
  todayISO,
} from '../utils/localDate';
import { getDailySignal } from '../utils/checkinHelpers';
import {
  collectBeforeAfterWindows,
  passesScalarDoseEffectFloor,
  windowWeeksLabel,
} from './engineStats';
import { confidenceFromBeforeAfter } from './confidence';
import { conflictWindowForChange } from './conflictResolution';

interface WellbeingSignalInput {
  checkins: SymptomCheckin[];
  medicationChanges: MedicationChange[];
  medications: Medication[];
  administrations: MedicationAdministration[];
  timezone: string;
}

// sleep_quality collected from slice 12 onward; mood_level from slice 15 onward.
// Sleep-lag analysis (night sweats -> sleep -> next-day energy) is queued for the AI layer / a future analyzer.

const WINDOW_DAYS = 21;
const WELLBEING_DOSE_MIN_POINTS = 4;
const VOLATILITY_LOOKBACK_DAYS = 21;
const VOLATILITY_MIN_POINTS = 10;
const VOLATILITY_THRESHOLD = 1.25;
const MOOD_VOLATILITY_THRESHOLD = 1.5;
const TROUGH_LOOKBACK_DAYS = 60;
const TROUGH_MIN_CYCLES = 3;
const TROUGH_MIN_AVG_POINTS_PER_POSITION = 2;
const TROUGH_MIN_GAP = 1;
const TROUGH_MIN_ADMINISTRATIONS = 3;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dailySignalSeries(checkins: SymptomCheckin[]) {
  return [...checkins]
    .map((c) => {
      const value = getDailySignal(c);
      return value !== null ? { date: c.checkin_date, value } : null;
    })
    .filter((p): p is { date: string; value: number } => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function moodSeries(checkins: SymptomCheckin[]) {
  return [...checkins]
    .filter((c) => c.mood_level !== null && c.mood_level !== undefined)
    .map((c) => ({ date: c.checkin_date, value: Number(c.mood_level) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function daysBetween(from: string, to: string): number {
  return daysBetweenISO(from, to);
}

function hasPostChangeWindowOpen(medicationChanges: MedicationChange[], today: string): boolean {
  return medicationChanges.some((c) => {
    const end = addDaysISO(c.change_date, WINDOW_DAYS);
    return today > c.change_date && today <= end;
  });
}

function doseChangeWellbeingInsights(input: WellbeingSignalInput): Insight[] {
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

function volatilityInsight(input: WellbeingSignalInput, suppress: boolean): Insight[] {
  if (suppress) return [];
  const points = dailySignalSeries(input.checkins);
  if (points.length < VOLATILITY_MIN_POINTS) return [];

  const today = points[points.length - 1].date;
  const start = addDaysISO(today, -VOLATILITY_LOOKBACK_DAYS);
  const recent = points.filter((p) => p.date >= start);
  if (recent.length < VOLATILITY_MIN_POINTS) return [];

  const swings: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const cur = recent[i];
    const gap = daysBetween(prev.date, cur.date);
    if (gap > 2) continue;
    swings.push(Math.abs(cur.value - prev.value));
  }
  if (swings.length < Math.max(6, Math.floor(VOLATILITY_MIN_POINTS / 2))) return [];

  const avgSwing = mean(swings);
  if (avgSwing === null || avgSwing < VOLATILITY_THRESHOLD) return [];

  const values = recent.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return [
    {
      id: 'wb-volatility',
      category: 'wellbeing_signal',
      priority: 'low',
      title: 'Your day-to-day energy swings widely',
      body: finalizeInsightBody(
        `Over the past three weeks your daily energy has moved an average of ${round1(
          avgSwing,
        ).toFixed(1)} points between consecutive logged days, ranging from ${min} to ${max}. Big day-to-day swings — rather than steadily low days — are a pattern many women notice during hormonal fluctuation.`,
        { n: recent.length },
        false,
      ),
      sampleSize: { n: recent.length },
      confidence: (() => {
        const mid = Math.floor(swings.length / 2);
        const earlySwings = swings.slice(0, mid);
        const lateSwings = swings.slice(mid);
        const earlyMean = mean(earlySwings) ?? 0;
        const lateMean = mean(lateSwings) ?? 0;
        return confidenceFromBeforeAfter(
          earlySwings,
          lateSwings,
          lateMean - earlyMean,
          VOLATILITY_LOOKBACK_DAYS,
          VOLATILITY_MIN_POINTS,
          { n: recent.length },
        );
      })(),
      supportingData: {},
      actionSuggestion:
        'Fluctuation patterns are worth showing your provider — they can point toward different adjustments than consistently low days do.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    },
  ];
}

function moodVolatilityInsight(input: WellbeingSignalInput, suppress: boolean): Insight[] {
  if (suppress) return [];
  const points = moodSeries(input.checkins);
  if (points.length < VOLATILITY_MIN_POINTS) return [];

  const today = points[points.length - 1].date;
  const start = addDaysISO(today, -VOLATILITY_LOOKBACK_DAYS);
  const recent = points.filter((p) => p.date >= start);
  if (recent.length < VOLATILITY_MIN_POINTS) return [];

  const swings: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const cur = recent[i];
    const gap = daysBetween(prev.date, cur.date);
    if (gap > 2) continue;
    swings.push(Math.abs(cur.value - prev.value));
  }
  if (swings.length < Math.max(6, Math.floor(VOLATILITY_MIN_POINTS / 2))) return [];

  const avgSwing = mean(swings);
  if (avgSwing === null || avgSwing < MOOD_VOLATILITY_THRESHOLD) return [];

  const values = recent.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return [
    {
      id: 'wb-mood-volatility',
      category: 'wellbeing_signal',
      priority: 'low',
      title: 'Your mood swings widely day to day',
      body: finalizeInsightBody(
        `Over the past three weeks your mood has moved an average of ${round1(
          avgSwing,
        ).toFixed(1)} points between consecutive logged days, ranging from ${min} to ${max} on the 1–5 scale.`,
        { n: recent.length },
        false,
      ),
      sampleSize: { n: recent.length },
      confidence: (() => {
        const mid = Math.floor(swings.length / 2);
        const earlySwings = swings.slice(0, mid);
        const lateSwings = swings.slice(mid);
        const earlyMean = mean(earlySwings) ?? 0;
        const lateMean = mean(lateSwings) ?? 0;
        return confidenceFromBeforeAfter(
          earlySwings,
          lateSwings,
          lateMean - earlyMean,
          VOLATILITY_LOOKBACK_DAYS,
          VOLATILITY_MIN_POINTS,
          { n: recent.length },
        );
      })(),
      supportingData: {},
      actionSuggestion:
        'Mood fluctuation patterns are worth showing your provider — fluctuation (not just low mood) is characteristic of hormonal transition.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    },
  ];
}

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

function troughInsights(input: WellbeingSignalInput): Insight[] {
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

function dipTripwire(input: WellbeingSignalInput, suppress: boolean): Insight[] {
  if (suppress) return [];
  const points = dailySignalSeries(input.checkins);
  if (points.length < 8) return [];

  const today = points[points.length - 1].date;
  const start30 = addDaysISO(today, -30);
  const last30 = points.filter((p) => p.date >= start30);
  if (last30.length < 8) return [];

  const avg30 = mean(last30.map((p) => p.value));
  if (avg30 === null) return [];

  const recent4: typeof points = [];
  for (let i = points.length - 1; i >= 0 && recent4.length < 4; i--) {
    if (recent4.length === 0) {
      recent4.push(points[i]);
      continue;
    }
    const prev = recent4[recent4.length - 1];
    const cur = points[i];
    const gap = daysBetween(cur.date, prev.date);
    if (gap > 2) break;
    recent4.push(cur);
  }
  if (recent4.length < 4) return [];
  recent4.reverse();

  const allLow = recent4.every((p) => p.value <= avg30 - 1);
  if (!allLow) return [];

  const latestDate = recent4[recent4.length - 1].date;

  return [
    {
      id: `wb-dip-${latestDate}`,
      category: 'observation',
      priority: 'low',
      title: 'Rougher few days than your usual',
      body: finalizeInsightBody(
        `Your last four daily pulses have run well below your recent average. If it feels right, a full check-in now would capture what's happening while it's fresh — useful detail for spotting what changed.`,
        { n: recent4.length },
        false,
      ),
      sampleSize: { n: recent4.length },
      confidence: confidenceFromBeforeAfter(
        last30.map((p) => p.value),
        recent4.map((p) => p.value),
        avg30 - mean(recent4.map((p) => p.value))!,
        30,
        4,
        { n: recent4.length },
      ),
      supportingData: {},
      actionSuggestion: undefined,
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    },
  ];
}

export function analyzeWellbeingSignal(input: WellbeingSignalInput): Insight[] {
  const doseInsights = doseChangeWellbeingInsights(input);

  const today =
    dailySignalSeries(input.checkins).slice(-1)[0]?.date ?? todayISO(input.timezone);

  const suppressForDoseWindow =
    hasPostChangeWindowOpen(input.medicationChanges, today) || doseInsights.length > 0;

  const moodVolatility = moodVolatilityInsight(input, suppressForDoseWindow);
  const energyVolatility = volatilityInsight(input, suppressForDoseWindow);
  const volatility = moodVolatility.length > 0 ? moodVolatility : energyVolatility;

  const trough = troughInsights(input);
  const dip = dipTripwire(input, suppressForDoseWindow);

  return [...doseInsights, ...volatility, ...trough, ...dip];
}
