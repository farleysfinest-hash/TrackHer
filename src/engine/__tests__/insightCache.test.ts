import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildEngineInputCacheKey,
  clearEngineResultCache,
  getCachedEngineResult,
  peekCachedEngineResult,
  setCachedEngineResult,
} from '../insightCache';
import { runPatternEngine } from '../patternEngine';
import type { EngineInput, PatternEngineResult } from '../types';
import type {
  ExtendedSymptomLog,
  LabResult,
  Medication,
  MedicationAdministration,
  MedicationChange,
  Profile,
  SymptomCheckin,
} from '../../types/database';
import { MRS_CANONICAL_KEYS } from '../../utils/checkinHelpers';

const TZ = 'America/Los_Angeles';
const USER_ID = 'user-test-1';

function makeCheckin(overrides: Partial<SymptomCheckin> = {}): SymptomCheckin {
  const baseScores = Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, 1 as const]));
  return {
    id: 'checkin-1',
    user_id: USER_ID,
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
    overall_wellbeing: 3,
    energy_level: 4,
    mood_level: 4,
    sleep_quality: 4,
    notes: 'Baseline note',
    is_backdated: false,
    created_at: '2026-07-01T12:00:00Z',
    ...baseScores,
    ...overrides,
  } as SymptomCheckin;
}

function makeExtendedSymptom(overrides: Partial<ExtendedSymptomLog> = {}): ExtendedSymptomLog {
  return {
    id: 'ext-1',
    user_id: USER_ID,
    checkin_id: 'checkin-1',
    symptom_key: 'brain_fog',
    severity: null,
    severity_score: 2,
    created_at: '2026-07-01T12:00:00Z',
    ...overrides,
  };
}

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    user_id: USER_ID,
    hormone_category: 'estrogen',
    delivery_method: 'patch',
    medication_name: 'Estradiol patch',
    dose_amount: 0.05,
    dose_unit: 'mg',
    units_per_dose: 1,
    secondary_dose_amount: null,
    secondary_dose_unit: null,
    tertiary_dose_amount: null,
    tertiary_dose_unit: null,
    frequency: 'twice_weekly',
    frequency_details: { days: ['monday', 'thursday'], interval: 3 },
    application_site: 'abdomen',
    start_date: '2026-01-01',
    end_date: null,
    is_active: true,
    prescriber_name: 'Dr. Smith',
    pharmacy_name: 'Main Pharmacy',
    notes: 'Apply in evening',
    pellet_insertion_date: null,
    pellet_expected_duration_months: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeMedicationChange(overrides: Partial<MedicationChange> = {}): MedicationChange {
  return {
    id: 'change-1',
    user_id: USER_ID,
    medication_id: 'med-1',
    change_type: 'dose_increased',
    previous_dose: 0.05,
    new_dose: 0.075,
    previous_method: 'patch',
    new_method: 'patch',
    change_date: '2026-06-01',
    notes: 'Titration',
    created_at: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

function makeAdministration(overrides: Partial<MedicationAdministration> = {}): MedicationAdministration {
  return {
    id: 'admin-1',
    user_id: USER_ID,
    medication_id: 'med-1',
    taken_at: '2026-07-01T08:00:00Z',
    event_timezone: TZ,
    local_date: '2026-07-01',
    utc_offset_minutes: -420,
    created_at: '2026-07-01T08:00:00Z',
    ...overrides,
  };
}

function makeLab(overrides: Partial<LabResult> = {}): LabResult {
  return {
    id: 'lab-1',
    user_id: USER_ID,
    draw_date: '2026-06-15',
    fasting: true,
    draw_time: '08:00',
    lab_name: 'Quest',
    estradiol: 45,
    estrone: 12,
    progesterone: 1.2,
    total_testosterone: 28,
    free_testosterone: 1.8,
    dhea_s: 120,
    shbg: 80,
    fsh: 25,
    lh: 12,
    tsh: 2.1,
    free_t3: 3.2,
    free_t4: 1.1,
    cortisol_am: 12,
    vitamin_d: 42,
    ferritin: 55,
    fasting_insulin: 8,
    hba1c: 5.4,
    hs_crp: 0.8,
    homocysteine: 9,
    prolactin: 10,
    igf1: 120,
    total_cholesterol: 190,
    ldl: 110,
    hdl: 55,
    triglycerides: 90,
    notes: 'Routine panel',
    created_at: '2026-06-15T12:00:00Z',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: USER_ID,
    display_name: 'Test Patient',
    email: 'test@example.com',
    menopause_stage: 'perimenopause',
    straw_stage: '-2',
    straw_stage_label: 'Early perimenopause',
    menopause_cause: null,
    last_period_date: '2026-05-01',
    last_period_timeframe: null,
    periods_status: 'changing',
    period_changes: 'variable',
    staging_completed_at: '2026-01-01T00:00:00Z',
    welcome_seen: true,
    has_uterus: true,
    has_uterus_confirmed_at: '2026-01-01T00:00:00Z',
    date_of_birth: '1975-03-15',
    checkin_frequency: 'weekly',
    checkin_day: 0,
    next_appointment_date: '2026-08-01',
    onboarding_completed: true,
    timezone: TZ,
    timezone_confirmed_at: '2026-01-01T00:00:00Z',
    ui_state: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeEngineInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    checkins: [makeCheckin(), makeCheckin({ id: 'checkin-2', checkin_date: '2026-06-24' })],
    extendedSymptoms: [makeExtendedSymptom()],
    medications: [makeMedication()],
    medicationChanges: [makeMedicationChange()],
    administrations: [makeAdministration()],
    labResults: [makeLab()],
    profile: makeProfile(),
    timezone: TZ,
    ...overrides,
  };
}

function emptyResult(): PatternEngineResult {
  return { primary: [], more: [], safeguarding: [], all: [] };
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function snapshotInput(input: EngineInput): string {
  return JSON.stringify(input);
}

function profileWithReorderedKeys(profile: Profile): Profile {
  const entries = Object.entries(profile);
  entries.reverse();
  return Object.fromEntries(entries) as Profile;
}

function mutateField<T extends object>(obj: T, key: keyof T, value: T[keyof T]): T {
  return { ...obj, [key]: value };
}

beforeEach(() => {
  clearEngineResultCache();
});

afterEach(() => {
  clearEngineResultCache();
  vi.restoreAllMocks();
});

describe('buildEngineInputCacheKey determinism', () => {
  it('returns the same key for repeated calls on the same object', () => {
    const input = makeEngineInput();
    expect(buildEngineInputCacheKey(input)).toBe(buildEngineInputCacheKey(input));
  });

  it('returns the same key for a deep clone with identical values', () => {
    const input = makeEngineInput();
    const clone = structuredClone(input);
    expect(buildEngineInputCacheKey(clone)).toBe(buildEngineInputCacheKey(input));
  });

  it('returns the same key when nested object keys were inserted in different orders', () => {
    const input = makeEngineInput({
      profile: profileWithReorderedKeys(makeProfile()),
      medications: [
        makeMedication({
          frequency_details: { interval: 3, days: ['monday', 'thursday'] },
        }),
      ],
    });
    const baseline = makeEngineInput();
    expect(buildEngineInputCacheKey(input)).toBe(buildEngineInputCacheKey(baseline));
  });

  it('changes the key when a multi-row array order is reversed', () => {
    const input = makeEngineInput();
    const reversed = makeEngineInput({
      checkins: [...input.checkins].reverse(),
    });
    expect(buildEngineInputCacheKey(reversed)).not.toBe(buildEngineInputCacheKey(input));
  });

  it('does not mutate or reorder the input', () => {
    const input = makeEngineInput();
    const before = snapshotInput(input);
    buildEngineInputCacheKey(input);
    expect(snapshotInput(input)).toBe(before);
    expect(input.checkins.map((c) => c.id)).toEqual(['checkin-1', 'checkin-2']);
  });

  it('supports deeply frozen valid input without throwing', () => {
    const input = deepFreeze(makeEngineInput());
    expect(() => buildEngineInputCacheKey(input)).not.toThrow();
    expect(buildEngineInputCacheKey(input)).toBeTypeOf('string');
  });

  it('distinguishes an explicit undefined property from an omitted property', () => {
    const omitted = makeEngineInput();
    const explicit = { ...makeEngineInput(), optionalFutureValue: undefined } as EngineInput;
    expect(buildEngineInputCacheKey(explicit)).not.toBe(buildEngineInputCacheKey(omitted));
  });

  it('distinguishes undefined array entries, sparse holes, and null', () => {
    const undefinedEntry = { ...makeEngineInput(), futureValues: [undefined] } as EngineInput;
    const sparseValues = new Array(1);
    const sparseEntry = { ...makeEngineInput(), futureValues: sparseValues } as EngineInput;
    const nullEntry = { ...makeEngineInput(), futureValues: [null] } as EngineInput;

    expect(buildEngineInputCacheKey(undefinedEntry)).not.toBe(buildEngineInputCacheKey(sparseEntry));
    expect(buildEngineInputCacheKey(undefinedEntry)).not.toBe(buildEngineInputCacheKey(nullEntry));
    expect(buildEngineInputCacheKey(sparseEntry)).not.toBe(buildEngineInputCacheKey(nullEntry));
  });

  it.each([
    ['function', () => undefined],
    ['symbol', Symbol('unsupported')],
    ['bigint', BigInt(1)],
    ['non-plain object', new Date('2026-07-01T00:00:00Z')],
  ])('returns null for an unsupported %s value', (_label, unsupported) => {
    const input = { ...makeEngineInput(), unsupported } as EngineInput;
    expect(buildEngineInputCacheKey(input)).toBeNull();
  });

  it('returns null for cyclic input', () => {
    const input = makeEngineInput() as EngineInput & { cycle?: unknown };
    input.cycle = input;
    expect(buildEngineInputCacheKey(input)).toBeNull();
  });
});

describe('buildEngineInputCacheKey top-level coverage', () => {
  it.each([
    ['checkins', (input: EngineInput) => makeEngineInput({ checkins: [mutateField(input.checkins[0]!, 'notes', 'Changed note'), input.checkins[1]!] })],
    [
      'extendedSymptoms',
      (input: EngineInput) =>
        makeEngineInput({
          extendedSymptoms: [mutateField(input.extendedSymptoms[0]!, 'symptom_key', 'dry_itchy_skin')],
        }),
    ],
    [
      'medications',
      (input: EngineInput) =>
        makeEngineInput({
          medications: [mutateField(input.medications[0]!, 'medication_name', 'Updated med')],
        }),
    ],
    [
      'medicationChanges',
      (input: EngineInput) =>
        makeEngineInput({
          medicationChanges: [mutateField(input.medicationChanges[0]!, 'previous_dose', 0.04)],
        }),
    ],
    [
      'administrations',
      (input: EngineInput) =>
        makeEngineInput({
          administrations: [mutateField(input.administrations[0]!, 'taken_at', '2026-07-01T09:00:00Z')],
        }),
    ],
    [
      'labResults',
      (input: EngineInput) =>
        makeEngineInput({
          labResults: [mutateField(input.labResults[0]!, 'estradiol', 99)],
        }),
    ],
    [
      'profile',
      (input: EngineInput) =>
        makeEngineInput({
          profile: mutateField(input.profile!, 'display_name', 'Updated name'),
        }),
    ],
    ['timezone', (_input: EngineInput) => makeEngineInput({ timezone: 'America/New_York' })],
  ])('changes the key when %s changes', (_label, mutate) => {
    const base = makeEngineInput();
    const mutated = mutate(base);
    expect(buildEngineInputCacheKey(mutated)).not.toBe(buildEngineInputCacheKey(base));
  });
});

describe('buildEngineInputCacheKey previously omitted values', () => {
  it.each([
    ['checkins[0].hot_flashes', (input: EngineInput) => makeEngineInput({ checkins: [mutateField(input.checkins[0]!, 'hot_flashes', 3), input.checkins[1]!] })],
    ['checkins[0].sexual_problems', (input: EngineInput) => makeEngineInput({ checkins: [mutateField(input.checkins[0]!, 'sexual_problems', 3), input.checkins[1]!] })],
    ['checkins[0].overall_wellbeing', (input: EngineInput) => makeEngineInput({ checkins: [mutateField(input.checkins[0]!, 'overall_wellbeing', 1), input.checkins[1]!] })],
    ['extendedSymptoms[0].symptom_key', (input: EngineInput) => makeEngineInput({ extendedSymptoms: [mutateField(input.extendedSymptoms[0]!, 'symptom_key', 'misophonia')] })],
    ['extendedSymptoms[0].severity_score', (input: EngineInput) => makeEngineInput({ extendedSymptoms: [mutateField(input.extendedSymptoms[0]!, 'severity_score', 4)] })],
    ['medications[0].medication_name', (input: EngineInput) => makeEngineInput({ medications: [mutateField(input.medications[0]!, 'medication_name', 'New name')] })],
    ['medications[0].dose_amount', (input: EngineInput) => makeEngineInput({ medications: [mutateField(input.medications[0]!, 'dose_amount', 0.075)] })],
    ['medications[0].delivery_method', (input: EngineInput) => makeEngineInput({ medications: [mutateField(input.medications[0]!, 'delivery_method', 'gel')] })],
    [
      'medications[0].frequency_details nested value',
      (_input: EngineInput) =>
        makeEngineInput({
          medications: [
            makeMedication({
              frequency_details: { days: ['monday', 'thursday'], interval: 4 },
            }),
          ],
        }),
    ],
    ['medicationChanges[0].previous_dose', (input: EngineInput) => makeEngineInput({ medicationChanges: [mutateField(input.medicationChanges[0]!, 'previous_dose', 0.03)] })],
    ['medicationChanges[0].new_dose', (input: EngineInput) => makeEngineInput({ medicationChanges: [mutateField(input.medicationChanges[0]!, 'new_dose', 0.08)] })],
    ['medicationChanges[0].new_method', (input: EngineInput) => makeEngineInput({ medicationChanges: [mutateField(input.medicationChanges[0]!, 'new_method', 'gel')] })],
    ['administrations[0].medication_id', (input: EngineInput) => makeEngineInput({ administrations: [mutateField(input.administrations[0]!, 'medication_id', 'med-2')] })],
    ['administrations[0].taken_at', (input: EngineInput) => makeEngineInput({ administrations: [mutateField(input.administrations[0]!, 'taken_at', '2026-07-01T10:30:00Z')] })],
    ['labResults[0].estradiol', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'estradiol', 60)] })],
    ['labResults[0].progesterone', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'progesterone', 2.5)] })],
    ['labResults[0].total_testosterone', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'total_testosterone', 35)] })],
    ['labResults[0].free_testosterone', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'free_testosterone', 2.2)] })],
    ['labResults[0].fsh', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'fsh', 30)] })],
    ['labResults[0].tsh', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'tsh', 3.0)] })],
    ['labResults[0].vitamin_d', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'vitamin_d', 50)] })],
    ['labResults[0].ldl', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'ldl', 125)] })],
    ['labResults[0].triglycerides', (input: EngineInput) => makeEngineInput({ labResults: [mutateField(input.labResults[0]!, 'triglycerides', 110)] })],
    ['profile.checkin_frequency', (input: EngineInput) => makeEngineInput({ profile: mutateField(input.profile!, 'checkin_frequency', 'daily') })],
    ['timezone', (_input: EngineInput) => makeEngineInput({ timezone: 'Europe/London' })],
  ])('changes the key when %s changes', (_label, mutate) => {
    const base = makeEngineInput();
    const mutated = mutate(base);
    expect(buildEngineInputCacheKey(mutated)).not.toBe(buildEngineInputCacheKey(base));
  });
});

describe('owner-scoped engine result cache', () => {
  it('returns the cached result for the same owner and key', () => {
    const result = emptyResult();
    setCachedEngineResult(USER_ID, 'key-a', result);
    expect(getCachedEngineResult(USER_ID, 'key-a')).toBe(result);
  });

  it('returns null for the same owner with a different key', () => {
    setCachedEngineResult(USER_ID, 'key-a', emptyResult());
    expect(getCachedEngineResult(USER_ID, 'key-b')).toBeNull();
  });

  it('returns null for a different owner with the same key', () => {
    setCachedEngineResult(USER_ID, 'key-a', emptyResult());
    expect(getCachedEngineResult('user-other', 'key-a')).toBeNull();
  });

  it('peeks the previous result for the same owner', () => {
    const result = emptyResult();
    setCachedEngineResult(USER_ID, 'key-a', result);
    expect(peekCachedEngineResult(USER_ID)).toBe(result);
  });

  it('returns null when peeking a different owner', () => {
    setCachedEngineResult(USER_ID, 'key-a', emptyResult());
    expect(peekCachedEngineResult('user-other')).toBeNull();
  });

  it('replaces the prior single cache entry', () => {
    const first = emptyResult();
    const second = emptyResult();
    setCachedEngineResult(USER_ID, 'key-a', first);
    setCachedEngineResult(USER_ID, 'key-b', second);
    expect(getCachedEngineResult(USER_ID, 'key-a')).toBeNull();
    expect(getCachedEngineResult(USER_ID, 'key-b')).toBe(second);
  });

  it('clears both normal reads and peeks', () => {
    setCachedEngineResult(USER_ID, 'key-a', emptyResult());
    clearEngineResultCache();
    expect(getCachedEngineResult(USER_ID, 'key-a')).toBeNull();
    expect(peekCachedEngineResult(USER_ID)).toBeNull();
  });
});

describe('runPatternEngine cache integration', () => {
  it('returns the same result object on a cache hit for deep-equivalent input', () => {
    const base = makeEngineInput();
    clearEngineResultCache();
    const first = runPatternEngine(base);
    const second = runPatternEngine(structuredClone(base));
    expect(second).toBe(first);
  });

  it.each([
    [
      'lab value',
      (input: EngineInput) =>
        makeEngineInput({
          labResults: [mutateField(input.labResults[0]!, 'estradiol', 99)],
        }),
    ],
    [
      'MRS symptom',
      (input: EngineInput) =>
        makeEngineInput({
          checkins: [mutateField(input.checkins[0]!, 'hot_flashes', 4), input.checkins[1]!],
        }),
    ],
    [
      'extended-symptom severity',
      (input: EngineInput) =>
        makeEngineInput({
          extendedSymptoms: [mutateField(input.extendedSymptoms[0]!, 'severity_score', 4)],
        }),
    ],
    [
      'medication dose',
      (input: EngineInput) =>
        makeEngineInput({
          medications: [mutateField(input.medications[0]!, 'dose_amount', 0.1)],
        }),
    ],
    [
      'medication-change dose',
      (input: EngineInput) =>
        makeEngineInput({
          medicationChanges: [mutateField(input.medicationChanges[0]!, 'new_dose', 0.09)],
        }),
    ],
    [
      'administration timestamp',
      (input: EngineInput) =>
        makeEngineInput({
          administrations: [mutateField(input.administrations[0]!, 'taken_at', '2026-07-01T11:00:00Z')],
        }),
    ],
  ])('recomputes when a previously omitted %s changes', (_label, mutate) => {
    const base = makeEngineInput();
    clearEngineResultCache();
    const first = runPatternEngine(base);
    const edited = mutate(base);
    const second = runPatternEngine(edited);
    expect(second).not.toBe(first);
  });

  it('runs uncached instead of throwing when the input contains an unsupported value', () => {
    const input = { ...makeEngineInput(), unsupported: () => undefined } as EngineInput;
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    clearEngineResultCache();

    const first = runPatternEngine(input);
    const second = runPatternEngine(input);

    expect(second).not.toBe(first);
    expect(peekCachedEngineResult(USER_ID)).toBeNull();
    expect(warning).toHaveBeenCalledTimes(1);
  });
});

describe('runPatternEngine owner isolation', () => {
  it('does not reuse cached results or previous results across owners', () => {
    const inputA = makeEngineInput({ profile: makeProfile({ id: 'user-a' }) });
    const inputB = makeEngineInput({
      profile: makeProfile({ id: 'user-b' }),
      checkins: inputA.checkins.map((c) => ({ ...c, user_id: 'user-b' })),
      extendedSymptoms: inputA.extendedSymptoms.map((e) => ({ ...e, user_id: 'user-b' })),
      medications: inputA.medications.map((m) => ({ ...m, user_id: 'user-b' })),
      medicationChanges: inputA.medicationChanges.map((c) => ({ ...c, user_id: 'user-b' })),
      administrations: inputA.administrations.map((a) => ({ ...a, user_id: 'user-b' })),
      labResults: inputA.labResults.map((l) => ({ ...l, user_id: 'user-b' })),
    });

    clearEngineResultCache();
    const resultA = runPatternEngine(inputA);
    const resultB = runPatternEngine(inputB);

    expect(resultB).not.toBe(resultA);
    expect(peekCachedEngineResult('user-b')).toBe(resultB);
    expect(peekCachedEngineResult('user-a')).toBeNull();
    const inputAKey = buildEngineInputCacheKey(inputA);
    expect(inputAKey).not.toBeNull();
    expect(getCachedEngineResult('user-a', inputAKey!)).toBeNull();
  });
});
