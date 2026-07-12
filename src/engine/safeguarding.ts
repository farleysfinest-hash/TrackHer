import type { SymptomCheckin } from '../types/database';
import { addDaysISO, todayISO } from '../utils/localDate';
import type { Insight } from './types';
import { finalizeInsightBody, INSIGHT_DISCLAIMER } from './types';

export interface SafeguardingInput {
  checkins: SymptomCheckin[];
  timezone: string;
}

const PSYCH_ITEMS = ['depressed_mood', 'irritability', 'anxiety', 'exhaustion'] as const;

const PSYCH_MODERATE = 8;
const PSYCH_SEVERE = 12;

function psychSubscale(c: SymptomCheckin): number | null {
  if (!c.mrs_complete) return null;
  for (const key of PSYCH_ITEMS) {
    if (c[key] === null || c[key] === undefined) return null;
  }
  return PSYCH_ITEMS.reduce((sum, key) => sum + (c[key] as number), 0);
}

function completeCheckinsDesc(checkins: SymptomCheckin[]): SymptomCheckin[] {
  return checkins
    .filter((c) => psychSubscale(c) !== null)
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
}

function mrsCompleteCheckinsDesc(checkins: SymptomCheckin[]): SymptomCheckin[] {
  return checkins
    .filter((c) => c.mrs_complete)
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
}

function inDateRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function pulseComposite(c: SymptomCheckin): number | null {
  const channels = [c.energy_level, c.mood_level, c.sleep_quality].filter(
    (v) => v !== null && v !== undefined,
  ) as number[];
  if (channels.length < 2) return null;
  return channels.reduce((a, b) => a + b, 0) / channels.length;
}

function isPulseBearing(c: SymptomCheckin): boolean {
  return (
    c.energy_level !== null ||
    c.mood_level !== null ||
    c.sleep_quality !== null
  );
}

function qualifyingCompositesByDay(
  checkins: SymptomCheckin[],
  start: string,
  end: string,
): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const c of checkins) {
    if (!inDateRange(c.checkin_date, start, end)) continue;
    const comp = pulseComposite(c);
    if (comp === null) continue;
    const existing = byDay.get(c.checkin_date);
    if (existing === undefined || comp > existing) {
      byDay.set(c.checkin_date, comp);
    }
  }
  return byDay;
}

function distinctPulseDates(
  checkins: SymptomCheckin[],
  start: string,
  end: string,
): number {
  const dates = new Set<string>();
  for (const c of checkins) {
    if (!isPulseBearing(c)) continue;
    if (inDateRange(c.checkin_date, start, end)) {
      dates.add(c.checkin_date);
    }
  }
  return dates.size;
}

function countCompleteInRange(
  complete: SymptomCheckin[],
  start: string,
  end: string,
): number {
  return complete.filter((c) => inDateRange(c.checkin_date, start, end)).length;
}

function buildTrendData(checkins: SymptomCheckin[]): Array<{ date: string; score: number }> {
  return [...checkins]
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
    .map((c) => ({ date: c.checkin_date, score: psychSubscale(c)! }));
}

function tier1Insight(complete: SymptomCheckin[]): Insight | null {
  if (complete.length < 2) return null;

  const [latest, second] = complete;
  const sLatest = psychSubscale(latest)!;
  const sSecond = psychSubscale(second)!;

  if (sLatest < PSYCH_MODERATE || sSecond < PSYCH_MODERATE) return null;

  const sampleSize = { n: 2 };
  const body =
    "Your mood and exhaustion scores have been in the higher range across your last two check-ins. That's worth naming to someone — your provider, or someone you trust.";

  return {
    id: 'safeguard-psych-t1',
    category: 'psych_trajectory',
    priority: 'high',
    title: 'Your mood and exhaustion scores have been high',
    body: finalizeInsightBody(body, sampleSize, false),
    sampleSize,
    confidence: {
      level: 'provisional',
      score: null,
      basis: 'Read directly from your own check-in scores.',
    },
    supportingData: {
      trendData: buildTrendData([second, latest]),
    },
    relatedSymptoms: ['depressed_mood', 'irritability', 'anxiety', 'exhaustion'],
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

function computeRising(complete: SymptomCheckin[]): {
  rising: boolean;
  c3: number;
  recent3: SymptomCheckin[];
} | null {
  if (complete.length < 3) return null;

  const recent3 = complete.slice(0, 3);
  const c3 = psychSubscale(recent3[0])!;
  const c2 = psychSubscale(recent3[1])!;
  const c1 = psychSubscale(recent3[2])!;

  const rising =
    c3 >= PSYCH_SEVERE &&
    c3 - c1 >= 3 &&
    c2 >= c1 - 1 &&
    c3 >= c2;

  return { rising, c3, recent3 };
}

function computeFloorLoss(checkins: SymptomCheckin[], timezone: string): boolean {
  const today = todayISO(timezone);
  const recentStart = addDaysISO(today, -6);
  const recentEnd = today;
  const baselineStart = addDaysISO(today, -34);
  const baselineEnd = addDaysISO(today, -28);

  const recentByDay = qualifyingCompositesByDay(checkins, recentStart, recentEnd);
  const baselineByDay = qualifyingCompositesByDay(checkins, baselineStart, baselineEnd);

  if (recentByDay.size < 4 || baselineByDay.size < 4) return false;

  const recentBest = Math.max(...recentByDay.values());
  const baselineWorst = Math.min(...baselineByDay.values());

  return recentBest < baselineWorst;
}

function computeWithdrawal(
  checkins: SymptomCheckin[],
  complete: SymptomCheckin[],
  timezone: string,
): boolean {
  const today = todayISO(timezone);
  const recentStart = addDaysISO(today, -13);
  const recentEnd = today;
  const baselineStart = addDaysISO(today, -41);
  const baselineEnd = addDaysISO(today, -14);

  const recentPulseDays = distinctPulseDates(checkins, recentStart, recentEnd);
  const baselinePulseDays = distinctPulseDates(checkins, baselineStart, baselineEnd);

  const recentRate = recentPulseDays / 2;
  const baselineRate = baselinePulseDays / 4;

  const c1 = baselineRate >= 3 && recentRate <= baselineRate * 0.5;

  const recentComplete = countCompleteInRange(complete, recentStart, recentEnd);
  const baselineComplete = countCompleteInRange(complete, baselineStart, baselineEnd);

  const c2 = recentComplete === 0 && baselineComplete >= 3;

  return c1 || c2;
}

function tier2Insight(
  complete: SymptomCheckin[],
  checkins: SymptomCheckin[],
  timezone: string,
): Insight | null {
  const risingResult = computeRising(complete);
  if (!risingResult || !risingResult.rising) return null;

  const floorLoss = computeFloorLoss(checkins, timezone);
  const withdrawal = computeWithdrawal(checkins, complete, timezone);

  if (!floorLoss && !withdrawal) return null;

  const { c3, recent3 } = risingResult;
  const escalationStep = Math.min(2, Math.max(0, Math.floor((c3 - PSYCH_SEVERE) / 2)));

  const sampleSize = { n: 3 };
  const body =
    "Your mood, anxiety and exhaustion scores have risen across your last three check-ins, and your daily pulse has followed. You don't have to work out what it means on your own. Talking to your GP, or to a crisis line, is a reasonable next step — not an overreaction.\n\nThis is what your record shows. What you do with it is yours to decide.";

  const ordered = [...recent3].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

  return {
    id: `safeguard-psych-t2-s${escalationStep}`,
    category: 'safeguarding',
    priority: 'high',
    title: 'Your scores have been climbing',
    body: finalizeInsightBody(body, sampleSize, false),
    sampleSize,
    confidence: {
      level: 'provisional',
      score: null,
      basis: 'Read directly from your own check-in scores.',
    },
    supportingData: {
      trendData: buildTrendData(ordered),
    },
    relatedSymptoms: ['depressed_mood', 'irritability', 'anxiety', 'exhaustion'],
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

function cardiacPersistenceInsight(mrsComplete: SymptomCheckin[]): Insight | null {
  if (mrsComplete.length < 4) return null;

  const last4 = mrsComplete.slice(0, 4);
  const highCount = last4.filter(
    (c) => c.heart_discomfort !== null && c.heart_discomfort >= 3,
  ).length;

  if (highCount < 3) return null;

  const sampleSize = { n: 4 };
  const body =
    "You've reported heart discomfort at a significant level in 3 of your last 4 check-ins. This is worth raising with your provider specifically — not as part of a general menopause conversation. Cardiac symptoms in women are dismissed and misattributed at higher rates than in men, including being attributed to menopause or anxiety. Ask directly whether a cardiac workup is warranted.";

  return {
    id: 'cardiac-persistence',
    category: 'cardiac_persistence',
    priority: 'high',
    title: 'Heart discomfort has been persistent',
    body: finalizeInsightBody(body, sampleSize, false),
    sampleSize,
    confidence: {
      level: 'provisional',
      score: null,
      basis: 'Read directly from your own check-in scores.',
    },
    supportingData: {},
    relatedSymptoms: ['heart_discomfort'],
    disclaimer: INSIGHT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

export function analyzeSafeguarding(input: SafeguardingInput): Insight[] {
  const complete = completeCheckinsDesc(input.checkins);
  const mrsComplete = mrsCompleteCheckinsDesc(input.checkins);

  const results: Insight[] = [];

  const t1 = tier1Insight(complete);
  if (t1) results.push(t1);

  const t2 = tier2Insight(complete, input.checkins, input.timezone);
  if (t2) results.push(t2);

  const cardiac = cardiacPersistenceInsight(mrsComplete);
  if (cardiac) results.push(cardiac);

  return results;
}
