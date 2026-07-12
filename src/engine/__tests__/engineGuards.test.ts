import { describe, expect, it } from 'vitest';
import { analyzeLabDiscordance } from '../labDiscordance';
import { analyzeSafeguarding } from '../safeguarding';
import { analyzeTrends } from '../trendDetector';
import { analyzeWellbeingSignal } from '../wellbeingSignal';
import { analyzeSymptomClusters } from '../clusterMatcher';
import { analyzeDoseCorrelations } from '../doseCorrelation';
import { analyzeEarlyObservations } from '../earlyObservations';
import { getStageProfile } from '../stageProfile';
import { resolveConflicts } from '../conflictResolution';
import { runPatternEngine } from '../patternEngine';
import type { EngineInput, Insight } from '../types';
import type { LabResult, MRSScore, Profile, SymptomCheckin } from '../../types/database';
import { hasMRSData, MRS_CANONICAL_KEYS } from '../../utils/checkinHelpers';
import { addDaysISO, todayISO } from '../../utils/localDate';

const TZ = 'America/Los_Angeles';

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

/** Psych subscale = depressed_mood + irritability + anxiety + exhaustion. */
function psychTuple(sum: number): [MRSScore, MRSScore, MRSScore, MRSScore] {
  const tuples: Record<number, [MRSScore, MRSScore, MRSScore, MRSScore]> = {
    5: [1, 1, 1, 2],
    7: [2, 2, 1, 2],
    9: [2, 2, 2, 3],
    10: [3, 2, 2, 3],
    11: [3, 3, 2, 3],
    13: [4, 3, 3, 3],
    15: [4, 4, 3, 4],
    16: [4, 4, 4, 4],
  };
  const t = tuples[sum];
  if (!t) throw new Error(`No psych tuple for sum ${sum}`);
  return t;
}

function makePsychComplete(
  date: string,
  psychSum: number,
  extra: Partial<SymptomCheckin> = {},
): SymptomCheckin {
  const [depressed_mood, irritability, anxiety, exhaustion] = psychTuple(psychSum);
  return makeCheckin({
    id: `psych-${date}-${psychSum}`,
    checkin_date: date,
    depressed_mood,
    irritability,
    anxiety,
    exhaustion,
    psychological_score: psychSum,
    mrs_complete: true,
    checkin_type: 'full',
    created_at: `${date}T12:00:00Z`,
    ...extra,
  });
}

function makePulseLevels(
  date: string,
  energy: number,
  mood: number,
  sleep: number,
): SymptomCheckin {
  return makeCheckin({
    id: `pulse-levels-${date}`,
    checkin_date: date,
    checkin_type: 'pulse',
    mrs_complete: false,
    ...Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, null])),
    energy_level: energy,
    mood_level: mood,
    sleep_quality: sleep,
    psychological_score: 0,
    total_score: 0,
    somatic_score: 0,
    urogenital_score: 0,
    created_at: `${date}T12:00:00Z`,
  });
}

/** Floor-loss: recent composites ≤2.0 on ≥4 days; baseline composites ≥3.0 on ≥4 days. */
function floorLossPulses(today: string): SymptomCheckin[] {
  const recentDays = [0, 1, 2, 3].map((d) => addDaysISO(today, -d));
  const baselineDays = [28, 29, 30, 31].map((d) => addDaysISO(today, -d));
  return [
    ...recentDays.map((d) => makePulseLevels(d, 2, 2, 2)),
    ...baselineDays.map((d) => makePulseLevels(d, 3, 3, 3)),
  ];
}

function assertInsightInvariants(insights: Insight[]): void {
  for (const insight of insights) {
    expect(insight.body).not.toContain('NaN');
    expect(insight.body).not.toContain('undefined');
    expect(insight.body).not.toContain('null');
    expect(insight.sampleSize).toBeDefined();
    const nums =
      'n' in insight.sampleSize
        ? [insight.sampleSize.n]
        : [insight.sampleSize.before, insight.sampleSize.after];
    for (const n of nums) {
      expect(Number.isFinite(n)).toBe(true);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
    }
    expect(Number.isNaN(Date.parse(insight.generatedAt))).toBe(false);
  }
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

describe('F1 — null total_score never reaches arithmetic', () => {
  const today = todayISO(TZ);
  const totalsOldestToNewest = [14, 13, 12, 9, 8, 7];
  const offsets = [30, 25, 20, 15, 10, 5];

  const validRows = totalsOldestToNewest.map((total, i) =>
    makeCheckin({
      id: `valid-${i}`,
      checkin_date: addDaysISO(today, -offsets[i]),
      total_score: total,
      created_at: `${addDaysISO(today, -offsets[i])}T12:00:00Z`,
    }),
  );

  const corruptRow = {
    ...makeCheckin({
      id: 'corrupt-null-total',
      checkin_date: today,
      created_at: `${today}T12:00:00Z`,
    }),
    total_score: null,
  } as unknown as SymptomCheckin;

  const allRows = [...validRows, corruptRow];

  it('hasMRSData rejects corrupt total_score null', () => {
    expect(hasMRSData(corruptRow)).toBe(false);
  });

  it('analyzeTrends: no NaN; numerics from the 6 valid rows only', () => {
    const insights = analyzeTrends({
      checkins: allRows,
      medications: [],
      labResults: [],
      timezone: TZ,
    });
    for (const insight of insights) {
      expect(insight.body).not.toContain('NaN');
      const claimed = insight.body.match(/-?\d+/g) ?? [];
      const earlyAvg = (14 + 13) / 2;
      const lateAvg = (8 + 7) / 2;
      const expected = new Set([
        String(Math.round(earlyAvg)),
        String(Math.round(lateAvg)),
        String(Math.abs(Math.round(lateAvg - earlyAvg))),
      ]);
      for (const n of claimed) {
        expect(n).not.toBe('NaN');
      }
      if (insight.id.startsWith('trend-overall')) {
        expect(claimed.some((n) => expected.has(n))).toBe(true);
      }
    }
  });

  it('analyzeSymptomClusters and analyzeDoseCorrelations: no throw, no NaN', () => {
    let clusters: Insight[] = [];
    let doses: Insight[] = [];
    expect(() => {
      clusters = analyzeSymptomClusters({
        checkins: allRows,
        extendedSymptoms: [],
        timezone: TZ,
      });
    }).not.toThrow();
    expect(() => {
      doses = analyzeDoseCorrelations({
        checkins: allRows,
        medicationChanges: [],
        medications: [],
      });
    }).not.toThrow();
    assertInsightInvariants(clusters);
    assertInsightInvariants(doses);
    for (const insight of [...clusters, ...doses]) {
      expect(insight.body).not.toContain('NaN');
    }
  });
});

describe('F2 — tier 2 supersedes tier 1', () => {
  const today = todayISO(TZ);

  it('both-qualify: exactly one safeguarding insight (t2), no t1', () => {
    // Null pulse channels on MRS rows so floor-loss composites come only from pulse rows.
    const pulseQuiet = {
      energy_level: null,
      mood_level: null,
      sleep_quality: null,
    } as Partial<SymptomCheckin>;
    const rising = [
      makePsychComplete(addDaysISO(today, -2), 9, pulseQuiet),
      makePsychComplete(addDaysISO(today, -1), 11, pulseQuiet),
      makePsychComplete(today, 13, pulseQuiet),
    ];
    const checkins = [...rising, ...floorLossPulses(today)];
    const results = analyzeSafeguarding({ checkins, timezone: TZ });
    assertInsightInvariants(results);
    const safeguarding = results.filter((i) => i.category === 'safeguarding');
    expect(safeguarding).toHaveLength(1);
    expect(safeguarding[0].id).toBe('safeguard-psych-t2-s0');
    expect(results.some((i) => i.id === 'safeguard-psych-t1')).toBe(false);
  });

  it('tier-1-only: last two at 9 and 10, older at 5', () => {
    const checkins = [
      makePsychComplete(addDaysISO(today, -21), 5),
      makePsychComplete(addDaysISO(today, -14), 5),
      makePsychComplete(addDaysISO(today, -7), 9),
      makePsychComplete(today, 10),
    ];
    const results = analyzeSafeguarding({ checkins, timezone: TZ });
    assertInsightInvariants(results);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('safeguard-psych-t1');
  });

  it('neither: subscales 7 and 9 — no psych insights', () => {
    const checkins = [
      makePsychComplete(addDaysISO(today, -7), 7),
      makePsychComplete(today, 9),
    ];
    const results = analyzeSafeguarding({ checkins, timezone: TZ });
    assertInsightInvariants(results);
    expect(results.some((i) => i.id === 'safeguard-psych-t1')).toBe(false);
    expect(results.some((i) => i.category === 'safeguarding')).toBe(false);
    expect(results.some((i) => i.category === 'psych_trajectory')).toBe(false);
  });
});

describe('F4 — escalation step is deterministic in the ID', () => {
  const today = todayISO(TZ);

  function bothQualifyWithC3(c3: number): Insight[] {
    const pulseQuiet = {
      energy_level: null,
      mood_level: null,
      sleep_quality: null,
    } as Partial<SymptomCheckin>;
    const rising = [
      makePsychComplete(addDaysISO(today, -2), 9, pulseQuiet),
      makePsychComplete(addDaysISO(today, -1), 11, pulseQuiet),
      makePsychComplete(today, c3, pulseQuiet),
    ];
    return analyzeSafeguarding({
      checkins: [...rising, ...floorLossPulses(today)],
      timezone: TZ,
    });
  }

  it('c3=13 → s0, c3=15 → s1, c3=16 → s2', () => {
    const r13 = bothQualifyWithC3(13);
    const r15 = bothQualifyWithC3(15);
    const r16 = bothQualifyWithC3(16);
    assertInsightInvariants([...r13, ...r15, ...r16]);
    expect(r13.some((i) => i.id === 'safeguard-psych-t2-s0')).toBe(true);
    expect(r15.some((i) => i.id === 'safeguard-psych-t2-s1')).toBe(true);
    expect(r16.some((i) => i.id === 'safeguard-psych-t2-s2')).toBe(true);
  });
});

describe('F5 — withdrawal path is intended behavior', () => {
  const today = todayISO(TZ);

  it('climbed-then-went-quiet fires tier 2 via withdrawal', () => {
    // climbed-then-went-quiet is the signal — stale scores citing is deliberate (audit F5)
    const rising = [
      makePsychComplete(addDaysISO(today, -25), 9),
      makePsychComplete(addDaysISO(today, -22), 11),
      makePsychComplete(addDaysISO(today, -20), 13),
    ];
    const results = analyzeSafeguarding({ checkins: rising, timezone: TZ });
    assertInsightInvariants(results);
    expect(results.some((i) => i.category === 'safeguarding')).toBe(true);
    expect(results.some((i) => i.id.startsWith('safeguard-psych-t2-'))).toBe(true);
  });
});

describe('F3 documented: same-date duplicates', () => {
  const today = todayISO(TZ);

  it('two rows, one day — pins current tier-1 behavior', () => {
    // F3: two rows, ONE day — "across your last two check-ins" copy is arguably wrong here. Pinned pending a DB uniqueness decision (audit F3).
    const checkins = [
      makePsychComplete(today, 9, { id: 'dup-a' }),
      makePsychComplete(today, 10, { id: 'dup-b' }),
    ];
    const results = analyzeSafeguarding({ checkins, timezone: TZ });
    assertInsightInvariants(results);
    expect(results.filter((i) => i.id === 'safeguard-psych-t1')).toHaveLength(1);
  });
});

describe('Cardiac persistence boundaries', () => {
  const today = todayISO(TZ);

  it('heart_discomfort [3,3,3,0] across last 4 MRS-complete → fires', () => {
    const checkins = [
      makePsychComplete(addDaysISO(today, -21), 5, { heart_discomfort: 0 }),
      makePsychComplete(addDaysISO(today, -14), 5, { heart_discomfort: 3 }),
      makePsychComplete(addDaysISO(today, -7), 5, { heart_discomfort: 3 }),
      makePsychComplete(today, 5, { heart_discomfort: 3 }),
    ];
    const results = analyzeSafeguarding({ checkins, timezone: TZ });
    assertInsightInvariants(results);
    expect(results.some((i) => i.id === 'cardiac-persistence')).toBe(true);
  });

  it('heart_discomfort [3,3,0,0] → does not fire', () => {
    const checkins = [
      makePsychComplete(addDaysISO(today, -21), 5, { heart_discomfort: 0 }),
      makePsychComplete(addDaysISO(today, -14), 5, { heart_discomfort: 0 }),
      makePsychComplete(addDaysISO(today, -7), 5, { heart_discomfort: 3 }),
      makePsychComplete(today, 5, { heart_discomfort: 3 }),
    ];
    const results = analyzeSafeguarding({ checkins, timezone: TZ });
    assertInsightInvariants(results);
    expect(results.some((i) => i.id === 'cardiac-persistence')).toBe(false);
  });

  it('[4,4,4] with only 3 MRS-complete → does not fire', () => {
    const checkins = [
      makePsychComplete(addDaysISO(today, -14), 5, { heart_discomfort: 4 }),
      makePsychComplete(addDaysISO(today, -7), 5, { heart_discomfort: 4 }),
      makePsychComplete(today, 5, { heart_discomfort: 4 }),
    ];
    const results = analyzeSafeguarding({ checkins, timezone: TZ });
    assertInsightInvariants(results);
    expect(results.some((i) => i.id === 'cardiac-persistence')).toBe(false);
  });

  it('[3,3,3,null] among last four — null is not-high; three 3s still fire', () => {
    const checkins = [
      makePsychComplete(addDaysISO(today, -21), 5, { heart_discomfort: null }),
      makePsychComplete(addDaysISO(today, -14), 5, { heart_discomfort: 3 }),
      makePsychComplete(addDaysISO(today, -7), 5, { heart_discomfort: 3 }),
      makePsychComplete(today, 5, { heart_discomfort: 3 }),
    ];
    let results: Insight[] = [];
    expect(() => {
      results = analyzeSafeguarding({ checkins, timezone: TZ });
    }).not.toThrow();
    assertInsightInvariants(results);
    expect(results.some((i) => i.id === 'cardiac-persistence')).toBe(true);
  });
});

describe('Every analyzer survives the malformed battery', () => {
  const allNullMrs = makeCheckin({
    id: 'all-null-items',
    ...Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, null])),
    mrs_complete: false,
    total_score: null,
  } as unknown as Partial<SymptomCheckin>);

  const battery: SymptomCheckin[][] = [
    [],
    [makePulseCheckin('2026-07-01')],
    [makeCheckin()],
    [allNullMrs],
    [makeIncompleteMrsCheckin('2026-07-01')],
  ];

  it('each exported analyzer returns safely on every shape', () => {
    const collected: Insight[] = [];

    for (const checkins of battery) {
      expect(() => {
        collected.push(
          ...analyzeSafeguarding({ checkins, timezone: TZ }),
          ...analyzeTrends({
            checkins,
            medications: [],
            labResults: [],
            timezone: TZ,
          }),
          ...analyzeWellbeingSignal({
            checkins,
            medicationChanges: [],
            medications: [],
            administrations: [],
            timezone: TZ,
          }),
          ...analyzeSymptomClusters({
            checkins,
            extendedSymptoms: [],
            timezone: TZ,
          }),
          ...analyzeDoseCorrelations({
            checkins,
            medicationChanges: [],
            medications: [],
          }),
          ...analyzeEarlyObservations({ checkins }),
          ...analyzeLabDiscordance({
            checkins,
            labResults: checkins.length === 0 ? [] : [makeLab()],
          }),
          ...resolveConflicts([]),
        );
      }).not.toThrow();

      // stage profile: documented object shape (not an Insight[])
      // note: analyzeHormonePatterns / analyzeStageProfile are not exported;
      // hormone matching lives in analyzeSymptomClusters; stage via getStageProfile.
      expect(() => getStageProfile(makeProfile())).not.toThrow();
      expect(() => getStageProfile(null)).not.toThrow();
      const stage = getStageProfile(makeProfile());
      expect(stage).toBeTypeOf('object');
    }

    assertInsightInvariants(collected);
  });
});
