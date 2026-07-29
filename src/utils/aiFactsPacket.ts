import type {
  LabResult,
  Medication,
  MedicationChange,
  Profile,
  SymptomCheckin,
} from '../types/database';
import type { Insight } from '../engine/types';
import { getDailySignal, getTrustedMrsTotal, hasMRSData } from './checkinHelpers';
import { getBiomarkerValue } from './labHelpers';
import { isAiForbiddenCategory } from './aiForbiddenCategories';

/** Compact packet sent to the AI assistant — keep under ~3k tokens when possible. */
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
  labs: Array<{
    drawDate: string;
    estradiol: number | null;
    progesterone: number | null;
    testosterone: number | null;
    fsh: number | null;
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
  labResults: LabResult[];
  insights: Insight[];
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function doseLabel(med: Medication): string | null {
  if (med.dose_amount == null) return null;
  const unit = med.dose_unit ?? '';
  return `${med.dose_amount}${unit ? ` ${unit}` : ''}`.trim();
}

/**
 * Build a privacy-conscious facts packet for GPT-4o-mini.
 * Omits safeguarding / psych / cardiac / bleeding-red-flag insight bodies
 * (engine keeps those — companion must never rewrite them).
 */
export function buildAiFactsPacket(input: AiFactsPacketInput): AiFactsPacket {
  const mrsRows = input.checkins
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
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-16);

  const pulseWindow = input.checkins
    .slice()
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
    .slice(-28);

  const energy: number[] = [];
  const mood: number[] = [];
  const sleep: number[] = [];
  for (const c of pulseWindow) {
    if (c.energy_level != null) energy.push(c.energy_level);
    if (c.mood_level != null) mood.push(c.mood_level);
    if (c.sleep_quality != null) sleep.push(c.sleep_quality);
    else {
      const legacy = getDailySignal(c);
      if (legacy != null && c.energy_level == null) energy.push(legacy);
    }
  }

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

  const labs = [...input.labResults]
    .sort((a, b) => a.draw_date.localeCompare(b.draw_date))
    .slice(-8)
    .map((lab) => ({
      drawDate: lab.draw_date,
      estradiol: getBiomarkerValue(lab, 'estradiol'),
      progesterone: getBiomarkerValue(lab, 'progesterone'),
      testosterone: getBiomarkerValue(lab, 'testosterone'),
      fsh: getBiomarkerValue(lab, 'fsh'),
    }));

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

  return {
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
    labs,
    engineInsights,
  };
}
