import { describe, expect, it } from 'vitest';
import { analyzeLabDiscordance } from '../labDiscordance';
import { runPatternEngine } from '../patternEngine';
import type { EngineInput } from '../types';
import type { LabResult, Profile, SymptomCheckin } from '../../types/database';
import { MRS_CANONICAL_KEYS } from '../../utils/checkinHelpers';

function makeCheckin(overrides: Partial<SymptomCheckin> = {}): SymptomCheckin {
  const baseScores = Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, 1 as const]));
  return {
    id: 'checkin-1',
    user_id: 'user-1',
    checkin_date: '2026-07-01',
    hot_flashes: 1,
    heart_discomfort: 1,
    sleep_problems: 1,
    depressed_mood: 1,
    irritability: 1,
    anxiety: 1,
    exhaustion: 1,
    sexual_problems: 1,
    bladder_problems: 1,
    vaginal_dryness: 1,
    joint_muscle_pain: 1,
    dry_itchy_skin: 1,
    brain_fog: 1,
    irregular_periods: 1,
    heavy_bleeding: 1,
    misophonia: 1,
    checkin_type: 'full',
    mrs_complete: true,
    total_score: 11,
    somatic_score: 3,
    psychological_score: 4,
    urogenital_score: 3,
    overall_wellbeing: null,
    energy_level: 4,
    mood_level: 4,
    sleep_quality: 4,
    notes: null,
    is_backdated: false,
    created_at: '2026-07-01T12:00:00Z',
    ...baseScores,
    ...overrides,
  } as SymptomCheckin;
}

function makePulseCheckin(date: string): SymptomCheckin {
  const nullMrs = Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, null]));
  return makeCheckin({
    id: `pulse-${date}`,
    checkin_date: date,
    checkin_type: 'pulse',
    mrs_complete: false,
    ...nullMrs,
    energy_level: 3,
    mood_level: 3,
    sleep_quality: 3,
    psychological_score: 0,
    total_score: 0,
    somatic_score: 0,
    urogenital_score: 0,
  });
}

function makeIncompleteMrsCheckin(date: string): SymptomCheckin {
  const nullMrs = Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, null]));
  return makeCheckin({
    id: `incomplete-${date}`,
    checkin_date: date,
    checkin_type: 'full',
    mrs_complete: false,
    ...nullMrs,
    psychological_score: 0,
    total_score: 0,
    somatic_score: 0,
    urogenital_score: 0,
  });
}

function makeLab(overrides: Partial<LabResult> = {}): LabResult {
  return {
    id: 'lab-1',
    user_id: 'user-1',
    draw_date: '2026-06-15',
    fasting: null,
    draw_time: null,
    lab_name: null,
    estradiol: 45,
    estrone: null,
    progesterone: null,
    total_testosterone: null,
    free_testosterone: null,
    dhea_s: null,
    shbg: null,
    fsh: null,
    lh: null,
    tsh: null,
    free_t3: null,
    free_t4: null,
    cortisol_am: null,
    vitamin_d: null,
    ferritin: null,
    fasting_insulin: null,
    hba1c: null,
    hs_crp: null,
    homocysteine: null,
    prolactin: null,
    igf1: null,
    total_cholesterol: null,
    ldl: null,
    hdl: null,
    triglycerides: null,
    notes: null,
    created_at: '2026-06-15T12:00:00Z',
    ...overrides,
  };
}

function makeProfile(): Profile {
  return {
    id: 'user-1',
    display_name: 'Test',
    email: 'test@example.com',
    menopause_stage: 'perimenopause',
    straw_stage: '-2',
    straw_stage_label: null,
    menopause_cause: null,
    last_period_date: null,
    last_period_timeframe: null,
    periods_status: null,
    period_changes: null,
    staging_completed_at: null,
    welcome_seen: true,
    has_uterus: true,
    date_of_birth: null,
    checkin_frequency: 'weekly',
    checkin_day: null,
    next_appointment_date: null,
    onboarding_completed: true,
    timezone: 'America/Los_Angeles',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function emptyEngineInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    checkins: [],
    extendedSymptoms: [],
    medications: [],
    medicationChanges: [],
    administrations: [],
    labResults: [],
    profile: makeProfile(),
    timezone: 'America/Los_Angeles',
    ...overrides,
  };
}

describe('engine guard fixtures', () => {
  it('1 — lab results present, pulse-only check-ins: no throw, returns []', () => {
    expect(() =>
      analyzeLabDiscordance({
        checkins: [makePulseCheckin('2026-07-01'), makePulseCheckin('2026-07-08')],
        labResults: [makeLab()],
      }),
    ).not.toThrow();
    expect(
      analyzeLabDiscordance({
        checkins: [makePulseCheckin('2026-07-01')],
        labResults: [makeLab()],
      }),
    ).toEqual([]);
  });

  it('2 — zero check-ins, one lab result', () => {
    expect(() =>
      analyzeLabDiscordance({ checkins: [], labResults: [makeLab()] }),
    ).not.toThrow();
  });

  it('3 — check-ins present, zero lab results', () => {
    expect(() =>
      analyzeLabDiscordance({ checkins: [makeCheckin()], labResults: [] }),
    ).not.toThrow();
  });

  it('4 — single complete MRS check-in and one lab', () => {
    expect(() =>
      analyzeLabDiscordance({
        checkins: [makeCheckin()],
        labResults: [makeLab()],
      }),
    ).not.toThrow();
  });

  it('5 — all MRS items null, mrs_complete false', () => {
    expect(() =>
      analyzeLabDiscordance({
        checkins: [makeIncompleteMrsCheckin('2026-07-01')],
        labResults: [makeLab()],
      }),
    ).not.toThrow();
    expect(
      analyzeLabDiscordance({
        checkins: [makeIncompleteMrsCheckin('2026-07-01')],
        labResults: [makeLab()],
      }),
    ).toEqual([]);
  });

  it('6 — runPatternEngine survives every shape', () => {
    const shapes: Partial<EngineInput>[] = [
      {
        checkins: [makePulseCheckin('2026-07-01')],
        labResults: [makeLab()],
      },
      { checkins: [], labResults: [makeLab()] },
      { checkins: [makeCheckin()], labResults: [] },
      { checkins: [makeCheckin()], labResults: [makeLab()] },
      {
        checkins: [makeIncompleteMrsCheckin('2026-07-01')],
        labResults: [makeLab()],
      },
    ];

    for (const shape of shapes) {
      expect(() => runPatternEngine(emptyEngineInput(shape))).not.toThrow();
    }
  });
});
