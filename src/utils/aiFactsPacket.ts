import type {
  LabResult,
  Medication,
  MedicationChange,
  MedicationAdministration,
  Profile,
  SymptomCheckin,
} from '../types/database';
import type { Insight } from '../engine/types';
import { getDailySignal, getTrustedMrsTotal, hasMRSData } from './checkinHelpers';
import { getBiomarkerValue } from './labHelpers';
import { isAiForbiddenCategory } from './aiForbiddenCategories';
import { daysBetweenISO } from './localDate';

/** Edge `requireFacts` rejects packets over 24k JSON chars. */
const FACTS_PACKET_MAX_CHARS = 24_000;

/** Match analysis-tool defaults for medication_change_window. */
const DOSE_BEFORE_DAYS = 28;
const DOSE_AFTER_DAYS = 42;
const DOSE_CHANGE_WINDOW_LIMIT = 4;
const PULSE_SERIES_DAYS = 60;

const LAB_PACKET_KEYS = [
  'estradiol',
  'progesterone',
  'total_testosterone',
  'fsh',
  'tsh',
  'shbg',
] as const;

/** Compact packet sent to the AI assistant — keep under Edge 24k JSON limit. */
export interface AiFactsPacket {
  generatedAt: string;
  timezone: string;
  profile: {
    displayName: string | null;
    strawStage: string | null;
    menopauseStage: string | null;
  };
  mrs: Array<{
    date: string;
    total: number;
    somatic: number | null;
    psychological: number | null;
    urogenital: number | null;
  }>;
  pulseRecent: {
    daysSampled: number;
    avgEnergy: number | null;
    avgMood: number | null;
    avgSleep: number | null;
  };
  /** Daily pulse points (honest nulls for missing days in range are omitted — only logged days). */
  pulseSeries: Array<{
    date: string;
    energy: number | null;
    mood: number | null;
    sleep: number | null;
  }>;
  medications: Array<{
    name: string;
    category: string | null;
    dose: string | null;
    startDate: string;
    endDate: string | null;
  }>;
  recentDoseChanges: Array<{
    date: string;
    medicationName: string | null;
    changeType: string;
    notes: string | null;
  }>;
  /** Deterministic before/after means around recent dose changes (engine math, Luna narrates). */
  doseChangeWindows: Array<{
    date: string;
    medicationName: string | null;
    changeType: string;
    beforeDays: number;
    afterDays: number;
    energy: { before: number | null; after: number | null; delta: number | null; beforeCount: number; afterCount: number };
    mood: { before: number | null; after: number | null; delta: number | null; beforeCount: number; afterCount: number };
    sleep: { before: number | null; after: number | null; delta: number | null; beforeCount: number; afterCount: number };
    mrsTotal: { before: number | null; after: number | null; delta: number | null; beforeCount: number; afterCount: number };
  }>;
  recentAdministrations: Array<{
    date: string;
    medicationName: string | null;
  }>;
  labs: Array<{
    drawDate: string;
    estradiol: number | null;
    progesterone: number | null;
    testosterone: number | null;
    fsh: number | null;
    tsh: number | null;
    shbg: number | null;
  }>;
  engineInsights: Array<{
    id: string;
    category: string;
    priority: string;
    title: string;
    body: string;
    confidence: string;
  }>;
}

export interface AiFactsPacketInput {
  timezone: string;
  profile: Profile | null;
  checkins: SymptomCheckin[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  administrations?: MedicationAdministration[];
  labResults: LabResult[];
  insights: Insight[];
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function delta(before: number | null, after: number | null): number | null {
  if (before === null || after === null) return null;
  return Math.round((after - before) * 10) / 10;
}

function doseLabel(med: Medication): string | null {
  if (med.dose_amount == null) return null;
  const unit = med.dose_unit ?? '';
  return `${med.dose_amount}${unit ? ` ${unit}` : ''}`.trim();
}

function pulseLevels(c: SymptomCheckin): {
  energy: number | null;
  mood: number | null;
  sleep: number | null;
} {
  let energy = c.energy_level ?? null;
  const mood = c.mood_level ?? null;
  const sleep = c.sleep_quality ?? null;
  if (energy == null) {
    const legacy = getDailySignal(c);
    if (legacy != null) energy = legacy;
  }
  return { energy, mood, sleep };
}

type WindowMetric = {
  before: number | null;
  after: number | null;
  delta: number | null;
  beforeCount: number;
  afterCount: number;
};

function windowMeans(
  points: Array<{ date: string; value: number }>,
  changeDate: string,
  beforeDays: number,
  afterDays: number,
): WindowMetric {
  const beforeVals: number[] = [];
  const afterVals: number[] = [];
  for (const row of points) {
    const beforeOffset = daysBetweenISO(row.date, changeDate);
    if (beforeOffset > 0 && beforeOffset <= beforeDays) beforeVals.push(row.value);
    const afterOffset = daysBetweenISO(changeDate, row.date);
    if (afterOffset >= 0 && afterOffset <= afterDays) afterVals.push(row.value);
  }
  const before = mean(beforeVals);
  const after = mean(afterVals);
  return {
    before,
    after,
    delta: delta(before, after),
    beforeCount: beforeVals.length,
    afterCount: afterVals.length,
  };
}

function trimPulseSeriesToFit(packet: AiFactsPacket): AiFactsPacket {
  let next = packet;
  while (JSON.stringify(next).length > FACTS_PACKET_MAX_CHARS && next.pulseSeries.length > 0) {
    const drop = Math.max(1, Math.ceil(next.pulseSeries.length * 0.1));
    next = { ...next, pulseSeries: next.pulseSeries.slice(drop) };
  }
  return next;
}

/**
 * Build a privacy-conscious facts packet for GPT-5.6 Luna.
 * Omits safeguarding / psych / cardiac / bleeding-red-flag insight bodies
 * (engine keeps those — companion must never rewrite them).
 */
export function buildAiFactsPacket(input: AiFactsPacketInput): AiFactsPacket {
  const sortedCheckins = input.checkins
    .slice()
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

  const mrsRows = sortedCheckins
    .filter(hasMRSData)
    .map((c) => {
      const total = getTrustedMrsTotal(c);
      if (total === null) return null;
      return {
        date: c.checkin_date,
        total,
        somatic: c.somatic_score,
        psychological: c.psychological_score,
        urogenital: c.urogenital_score,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(-16);

  const pulseWindow = sortedCheckins.slice(-28);
  const energy: number[] = [];
  const mood: number[] = [];
  const sleep: number[] = [];
  for (const c of pulseWindow) {
    const levels = pulseLevels(c);
    if (levels.energy != null) energy.push(levels.energy);
    if (levels.mood != null) mood.push(levels.mood);
    if (levels.sleep != null) sleep.push(levels.sleep);
  }

  const pulseSeries = sortedCheckins
    .slice(-PULSE_SERIES_DAYS)
    .map((c) => {
      const levels = pulseLevels(c);
      if (levels.energy == null && levels.mood == null && levels.sleep == null) return null;
      return {
        date: c.checkin_date,
        energy: levels.energy,
        mood: levels.mood,
        sleep: levels.sleep,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const medById = new Map(input.medications.map((m) => [m.id, m]));

  const recentDoseChanges = [...input.medicationChanges]
    .sort((a, b) => a.change_date.localeCompare(b.change_date))
    .slice(-12)
    .map((ch) => ({
      date: ch.change_date,
      medicationName: medById.get(ch.medication_id ?? '')?.medication_name ?? null,
      changeType: ch.change_type,
      notes: ch.notes,
    }));

  const energyPoints = sortedCheckins
    .map((c) => {
      const v = pulseLevels(c).energy;
      return v == null ? null : { date: c.checkin_date, value: v };
    })
    .filter((r): r is { date: string; value: number } => r !== null);
  const moodPoints = sortedCheckins
    .map((c) => {
      const v = pulseLevels(c).mood;
      return v == null ? null : { date: c.checkin_date, value: v };
    })
    .filter((r): r is { date: string; value: number } => r !== null);
  const sleepPoints = sortedCheckins
    .map((c) => {
      const v = pulseLevels(c).sleep;
      return v == null ? null : { date: c.checkin_date, value: v };
    })
    .filter((r): r is { date: string; value: number } => r !== null);
  const mrsPoints = mrsRows.map((r) => ({ date: r.date, value: r.total }));

  const doseChangeWindows = [...input.medicationChanges]
    .sort((a, b) => a.change_date.localeCompare(b.change_date))
    .slice(-DOSE_CHANGE_WINDOW_LIMIT)
    .map((ch) => {
      const energyW = windowMeans(energyPoints, ch.change_date, DOSE_BEFORE_DAYS, DOSE_AFTER_DAYS);
      const moodW = windowMeans(moodPoints, ch.change_date, DOSE_BEFORE_DAYS, DOSE_AFTER_DAYS);
      const sleepW = windowMeans(sleepPoints, ch.change_date, DOSE_BEFORE_DAYS, DOSE_AFTER_DAYS);
      const mrsW = windowMeans(mrsPoints, ch.change_date, DOSE_BEFORE_DAYS, DOSE_AFTER_DAYS);
      return {
        date: ch.change_date,
        medicationName: medById.get(ch.medication_id ?? '')?.medication_name ?? null,
        changeType: ch.change_type,
        beforeDays: DOSE_BEFORE_DAYS,
        afterDays: DOSE_AFTER_DAYS,
        energy: energyW,
        mood: moodW,
        sleep: sleepW,
        mrsTotal: mrsW,
      };
    });

  const recentAdministrations = [...(input.administrations ?? [])]
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at))
    .slice(-30)
    .map((administration) => ({
      date: administration.local_date ?? administration.taken_at.slice(0, 10),
      medicationName: medById.get(administration.medication_id)?.medication_name ?? null,
    }));

  const labs = [...input.labResults]
    .sort((a, b) => a.draw_date.localeCompare(b.draw_date))
    .slice(-8)
    .map((lab) => {
      const values: Record<(typeof LAB_PACKET_KEYS)[number], number | null> = {
        estradiol: null,
        progesterone: null,
        total_testosterone: null,
        fsh: null,
        tsh: null,
        shbg: null,
      };
      for (const key of LAB_PACKET_KEYS) {
        values[key] = getBiomarkerValue(lab, key);
      }
      return {
        drawDate: lab.draw_date,
        estradiol: values.estradiol,
        progesterone: values.progesterone,
        testosterone: values.total_testosterone,
        fsh: values.fsh,
        tsh: values.tsh,
        shbg: values.shbg,
      };
    });

  const engineInsights = input.insights
    .filter((i) => !isAiForbiddenCategory(i.category))
    .slice(0, 8)
    .map((i) => ({
      id: i.id,
      category: String(i.category),
      priority: String(i.priority),
      title: i.title,
      body: i.body.slice(0, 400),
      confidence: String(i.confidence),
    }));

  const packet: AiFactsPacket = {
    generatedAt: new Date().toISOString(),
    timezone: input.timezone,
    profile: {
      displayName: input.profile?.display_name ?? null,
      strawStage: input.profile?.straw_stage ?? null,
      menopauseStage: input.profile?.menopause_stage ?? null,
    },
    mrs: mrsRows,
    pulseRecent: {
      daysSampled: pulseWindow.length,
      avgEnergy: mean(energy),
      avgMood: mean(mood),
      avgSleep: mean(sleep),
    },
    pulseSeries,
    medications: input.medications
      .filter((m) => m.is_active && !m.end_date)
      .slice(0, 12)
      .map((m) => ({
        name: m.medication_name,
        category: m.hormone_category,
        dose: doseLabel(m),
        startDate: m.start_date,
        endDate: m.end_date,
      })),
    recentDoseChanges,
    doseChangeWindows,
    recentAdministrations,
    labs,
    engineInsights,
  };

  return trimPulseSeriesToFit(packet);
}
