import type { Insight } from './types';
import { INSIGHT_DISCLAIMER } from './types';
import type { Medication, MedicationChange, SymptomCheckin, MedicationAdministration } from '../types/database';
import { getDoseCycleDays, getMedicationChangeLabel } from '../utils/medicationHelpers';

interface WellbeingSignalInput {
  checkins: SymptomCheckin[];
  medicationChanges: MedicationChange[];
  medications: Medication[];
  administrations: MedicationAdministration[];
}

// sleep_quality is collected from slice 12 onward; sleep-lag analysis
// (night sweats -> sleep -> next-day wellbeing) is queued for the AI layer / a future analyzer.

const WINDOW_DAYS = 21;
const WELLBEING_DOSE_MIN_POINTS = 5;
const VOLATILITY_LOOKBACK_DAYS = 21;
const VOLATILITY_MIN_POINTS = 10;
const VOLATILITY_THRESHOLD = 2.5;
const TROUGH_LOOKBACK_DAYS = 60;
const TROUGH_MIN_CYCLES = 3;
const TROUGH_MIN_AVG_POINTS_PER_POSITION = 2;
const TROUGH_MIN_GAP = 1.5;
const TROUGH_MIN_ADMINISTRATIONS = 3;

function addDaysISO(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${month}-${day}`;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function wellbeingSeries(checkins: SymptomCheckin[]) {
  return [...checkins]
    .filter((c) => c.overall_wellbeing !== null && c.overall_wellbeing !== undefined)
    .map((c) => ({ date: c.checkin_date, value: Number(c.overall_wellbeing) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00');
  const b = new Date(to + 'T12:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function hasPostChangeWindowOpen(medicationChanges: MedicationChange[], today: string): boolean {
  return medicationChanges.some((c) => {
    const end = addDaysISO(c.change_date, WINDOW_DAYS);
    return today > c.change_date && today <= end;
  });
}

function doseChangeWellbeingInsights(input: WellbeingSignalInput): Insight[] {
  const { checkins, medicationChanges, medications } = input;
  const points = wellbeingSeries(checkins);
  if (points.length < 2) return [];

  const insights: Insight[] = [];

  for (const change of medicationChanges) {
    const medication = medications.find((m) => m.id === change.medication_id);
    if (!medication) continue;

    const beforeStart = addDaysISO(change.change_date, -WINDOW_DAYS);
    const afterEnd = addDaysISO(change.change_date, WINDOW_DAYS);

    const before = points.filter((p) => p.date >= beforeStart && p.date < change.change_date);
    const after = points.filter((p) => p.date > change.change_date && p.date <= afterEnd);

    if (before.length < WELLBEING_DOSE_MIN_POINTS || after.length < WELLBEING_DOSE_MIN_POINTS) {
      continue;
    }

    const avgBefore = mean(before.map((p) => p.value));
    const avgAfter = mean(after.map((p) => p.value));
    if (avgBefore === null || avgAfter === null) continue;

    const diff = avgAfter - avgBefore;
    if (Math.abs(diff) < 1.0) continue;

    const improved = diff > 0;
    const changeLabel = getMedicationChangeLabel(change, medication);
    const title = improved
      ? `Your daily wellbeing rose after ${changeLabel}`
      : `Your daily wellbeing fell after ${changeLabel}`;

    const body = improved
      ? `In the ${WINDOW_DAYS} days before your change on ${change.change_date}, your average daily wellbeing was ${round1(
          avgBefore,
        ).toFixed(1)} across ${before.length} daily readings. In the ${WINDOW_DAYS} days after, it averaged ${round1(
          avgAfter,
        ).toFixed(1)} across ${after.length} readings.`
      : `In the ${WINDOW_DAYS} days before your change on ${change.change_date}, your average daily wellbeing was ${round1(
          avgBefore,
        ).toFixed(1)} across ${before.length} daily readings. In the ${WINDOW_DAYS} days after, it averaged ${round1(
          avgAfter,
        ).toFixed(1)} across ${after.length} readings.`;

    insights.push({
      id: `wb-dose-${change.id}`,
      category: 'wellbeing_signal',
      priority: improved ? 'positive' : 'medium',
      title,
      body,
      supportingData: {},
      relatedMedication: medication.id,
      actionSuggestion: improved
        ? 'If this matches how you feel, keep logging daily pulses to see whether the change holds.'
        : 'If this matches how you feel, consider discussing it with your provider.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}

function volatilityInsight(input: WellbeingSignalInput, suppress: boolean): Insight[] {
  if (suppress) return [];
  const points = wellbeingSeries(input.checkins);
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
      title: 'Your day-to-day wellbeing swings widely',
      body: `Over the past three weeks your daily wellbeing has moved an average of ${Math.round(
        avgSwing,
      )} points between days, ranging from ${min} to ${max}. Big day-to-day swings — rather than steadily low days — are a pattern many women notice during hormonal fluctuation.`,
      supportingData: {},
      actionSuggestion:
        'Fluctuation patterns are worth showing your provider — they can point toward different adjustments than consistently low days do.',
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    },
  ];
}

function fractionalDaysBetween(fromIso: string, toDateStr: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toDateStr + 'T12:00:00').getTime();
  return (to - from) / (1000 * 60 * 60 * 24);
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
): Insight {
  const anchorNote = adminAnchored ? ', based on your logged doses' : '';
  return {
    id: `wb-trough-${med.id}`,
    category: 'wellbeing_signal',
    priority: 'medium',
    title: `Your wellbeing dips at the end of your ${med.medication_name} cycle`,
    body: `Across your recent pulses, your average wellbeing on the last day of your ${med.medication_name} cycle was ${round1(
      endMean,
    ).toFixed(1)}, compared with a best-day average of ${round1(bestMean).toFixed(
      1,
    )}${anchorNote}. This end-of-cycle dip held across about ${completeCycles} cycles.`,
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

  return buildTroughInsight(med, endMean, best.mean, completeCycles, adminAnchored);
}

function troughInsightForMed(
  med: Medication,
  recent: Array<{ date: string; value: number }>,
  administrations: MedicationAdministration[],
): Insight | null {
  const windowStart = addDaysISO(recent[recent.length - 1]?.date ?? todayISO(), -TROUGH_LOOKBACK_DAYS);
  const medAdmins = administrations
    .filter((a) => a.medication_id === med.id && a.taken_at >= `${windowStart}T00:00:00`)
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at));

  if (medAdmins.length >= TROUGH_MIN_ADMINISTRATIONS) {
    const cycleDays = meanAdminIntervalDays(medAdmins);
    if (cycleDays && cycleDays >= 1) {
      const firstAdminDate = medAdmins[0].taken_at.slice(0, 10);
      const usable = recent.filter((p) => p.date >= firstAdminDate);
      if (usable.length >= cycleDays * TROUGH_MIN_CYCLES) {
        const spanDays = fractionalDaysBetween(medAdmins[0].taken_at, usable[usable.length - 1].date);
        const completeCycles = Math.floor(spanDays / cycleDays);
        if (completeCycles >= TROUGH_MIN_CYCLES) {
          const insight = analyzeTroughFromPositions(
            med,
            usable,
            cycleDays,
            (p) => {
              const adminsBefore = medAdmins.filter((a) => a.taken_at <= `${p.date}T23:59:59`);
              if (adminsBefore.length === 0) return null;
              const lastAdmin = adminsBefore[adminsBefore.length - 1];
              const daysSince = fractionalDaysBetween(lastAdmin.taken_at, p.date);
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

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function troughInsights(input: WellbeingSignalInput): Insight[] {
  const points = wellbeingSeries(input.checkins);
  if (points.length < 20) return [];

  const today = points[points.length - 1].date;
  const start = addDaysISO(today, -TROUGH_LOOKBACK_DAYS);
  const recent = points.filter((p) => p.date >= start);

  const insights: Insight[] = [];

  for (const med of input.medications.filter((m) => m.is_active)) {
    const insight = troughInsightForMed(med, recent, input.administrations);
    if (insight) insights.push(insight);
  }

  return insights;
}

function dipTripwire(input: WellbeingSignalInput, suppress: boolean): Insight[] {
  if (suppress) return [];
  const points = wellbeingSeries(input.checkins);
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

  const allLow = recent4.every((p) => p.value <= avg30 - 2);
  if (!allLow) return [];

  const latestDate = recent4[recent4.length - 1].date;

  return [
    {
      id: `wb-dip-${latestDate}`,
      category: 'observation',
      priority: 'low',
      title: 'Rougher few days than your usual',
      body: `Your last four daily pulses have run well below your recent average. If it feels right, a full check-in now would capture what's happening while it's happening — useful detail for spotting what changed.`,
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
    wellbeingSeries(input.checkins).slice(-1)[0]?.date ?? new Date().toISOString().split('T')[0];

  const suppressForDoseWindow =
    hasPostChangeWindowOpen(input.medicationChanges, today) || doseInsights.length > 0;

  const volatility = volatilityInsight(input, suppressForDoseWindow);
  const trough = troughInsights(input);
  const dip = dipTripwire(input, suppressForDoseWindow);

  return [...doseInsights, ...volatility, ...trough, ...dip];
}

