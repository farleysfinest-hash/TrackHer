/**
 * Seed a coherent 180-day test fixture for the Patterns tab.
 *
 * Safe default:
 *   npx tsx scripts/seed-pattern-history.ts --dry-run
 *
 * Apply:
 *   npx tsx scripts/seed-pattern-history.ts --apply
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { analyzeSymptomClusters } from '../src/engine/clusterMatcher';
import { analyzeSafeguarding } from '../src/engine/safeguarding';
import { analyzeTrends } from '../src/engine/trendDetector';
import type { SymptomCheckin } from '../src/types/database';
import {
  MRS_CANONICAL_KEYS,
  type MRSSymptomKey,
} from '../src/utils/checkinHelpers';
import {
  addDaysISO,
  dayOfWeekISO,
  daysBetweenISO,
  isValidTimeZone,
  todayISO,
} from '../src/utils/localDate';

const DEFAULT_DAYS = 180;
const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const TARGET_CLUSTER_ID = 'cluster-estrogen_low';
const BATCH_SIZE = 200;
const PERSONAL_HISTORY_WEEKS = 12;

type PulseLevel = 1 | 2 | 3 | 4 | 5;
type MrsValue = 0 | 1 | 2 | 3 | 4;
type PersonalSeverity = MrsValue | null;

const PERSONAL_SYMPTOMS = [
  {
    symptomId: 'brain_fog',
    isWatchSymptom: true,
    scores: [3, 3, 2, 2, 2, 2, 2, 1, 2, 1, 1, 1],
  },
  {
    symptomId: 'dry_itchy_skin',
    isWatchSymptom: true,
    scores: [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3],
  },
  {
    symptomId: 'headaches',
    isWatchSymptom: false,
    scores: [0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1],
  },
  {
    symptomId: 'night_sweats',
    isWatchSymptom: true,
    scores: [4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 3, 2],
  },
  {
    symptomId: 'weight_gain',
    isWatchSymptom: false,
    scores: [2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1],
  },
  {
    symptomId: 'whole_body_aches',
    isWatchSymptom: true,
    scores: [3, 3, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2],
  },
  {
    symptomId: 'joint_stiffness',
    isWatchSymptom: false,
    scores: [3, null, 3, 2, 3, 2, null, 2, 2, 2, 1, 2],
  },
  {
    symptomId: 'tinnitus',
    isWatchSymptom: false,
    scores: [1, 1, 2, null, 2, 1, 1, null, 2, 1, 1, 1],
  },
  {
    symptomId: 'word_finding_difficulty',
    isWatchSymptom: false,
    scores: [3, 3, 2, 2, null, 2, 2, 1, 1, 2, 1, 1],
  },
] as const satisfies ReadonlyArray<{
  symptomId: string;
  isWatchSymptom: boolean;
  scores: readonly PersonalSeverity[];
}>;

export interface SeedRow {
  user_id: string;
  checkin_date: string;
  hot_flashes: MrsValue | null;
  heart_discomfort: MrsValue | null;
  sleep_problems: MrsValue | null;
  depressed_mood: MrsValue | null;
  irritability: MrsValue | null;
  anxiety: MrsValue | null;
  exhaustion: MrsValue | null;
  sexual_problems: MrsValue | null;
  bladder_problems: MrsValue | null;
  vaginal_dryness: MrsValue | null;
  joint_muscle_pain: MrsValue | null;
  dry_itchy_skin: null;
  brain_fog: null;
  irregular_periods: null;
  heavy_bleeding: null;
  misophonia: null;
  energy_level: PulseLevel;
  mood_level: PulseLevel;
  sleep_quality: PulseLevel;
  overall_wellbeing: null;
  notes: string | null;
  checkin_type: 'full' | 'pulse';
  mrs_complete: boolean;
  is_backdated: boolean;
  created_at: string;
}

export interface SeedSummary {
  timezone: string;
  startDate: string;
  endDate: string;
  totalRows: number;
  pulseRows: number;
  fullRows: number;
  pulseCompleteRows: number;
  wednesdays: string[];
  mrsSpanDays: number;
  mrsInRecentWindow: number;
  clusterIds: string[];
  safeguardingIds: string[];
  trendIds: string[];
}

export interface PersonalSymptomSeedRow {
  user_id: string;
  checkin_id: string;
  symptom_key: string;
  severity: null;
  severity_score: MrsValue;
  created_at: string;
}

function clampPulse(value: number): PulseLevel {
  return Math.max(1, Math.min(5, value)) as PulseLevel;
}

function pulseForDate(date: string): Pick<
  SeedRow,
  'energy_level' | 'mood_level' | 'sleep_quality'
> {
  const weekday = dayOfWeekISO(date);

  // The fixture follows the account's real medication timeline:
  // - therapy started 2026-04-11
  // - progesterone increased 2026-06-10
  // Symptoms and sleep improve, while daytime energy temporarily dips after
  // the dose increase. This intentionally exercises mixed-signal handling.
  let energyBase = 3;
  if (date < '2026-04-11') energyBase = 2;
  else if (date < '2026-05-13') energyBase = 3;
  else if (date < '2026-06-10') energyBase = 4;
  else if (date <= '2026-07-08') energyBase = 3;
  else energyBase = 4;

  let moodBase = date < '2026-04-11' ? 3 : 4;
  let sleepBase = date < '2026-04-11' ? 2 : date <= '2026-06-10' ? 2 : 3;

  let energy = clampPulse(energyBase + (weekday === 6 ? 1 : weekday === 1 ? -1 : 0));
  let mood = clampPulse(moodBase + (weekday === 0 ? 1 : weekday === 2 ? -1 : 0));
  let sleep = clampPulse(sleepBase + (weekday === 6 ? 1 : weekday === 1 ? -1 : 0));

  // Isolated boundary values make charts and filters exercise 1 and 5 without
  // creating a recent volatility or four-day-dip insight.
  if (date === '2026-02-06') energy = 1;
  if (date === '2026-02-14') mood = 5;
  if (date === '2026-03-08') sleep = 1; // DST transition in Los Angeles.
  if (date === '2026-04-18') sleep = 5;
  if (date === '2026-05-23') energy = 5;
  if (date === '2026-06-28') mood = 2;

  return {
    energy_level: energy,
    mood_level: mood,
    sleep_quality: sleep,
  };
}

function mrsForDate(date: string): Record<MRSSymptomKey, MrsValue> {
  if (date < '2026-04-11') {
    return {
      depressed_mood: 2,
      irritability: 1,
      anxiety: 1,
      exhaustion: 3,
      hot_flashes: 4,
      heart_discomfort: 1,
      sleep_problems: 4,
      joint_muscle_pain: 4,
      sexual_problems: 1,
      bladder_problems: 2,
      vaginal_dryness: 3,
    };
  }

  if (date < '2026-05-13') {
    return {
      depressed_mood: 2,
      irritability: 1,
      anxiety: 1,
      exhaustion: 2,
      hot_flashes: 4,
      heart_discomfort: 1,
      sleep_problems: 3,
      joint_muscle_pain: 4,
      sexual_problems: 1,
      bladder_problems: 2,
      vaginal_dryness: 3,
    };
  }

  if (date < '2026-06-10') {
    return {
      depressed_mood: 2,
      irritability: 1,
      anxiety: 1,
      exhaustion: 2,
      hot_flashes: 3,
      heart_discomfort: 1,
      sleep_problems: 4,
      joint_muscle_pain: 3,
      sexual_problems: 1,
      bladder_problems: 2,
      vaginal_dryness: 3,
    };
  }

  if (date === '2026-06-10') {
    return {
      depressed_mood: 1,
      irritability: 1,
      anxiety: 1,
      exhaustion: 2,
      hot_flashes: 3,
      heart_discomfort: 1,
      sleep_problems: 3,
      joint_muscle_pain: 3,
      sexual_problems: 1,
      bladder_problems: 2,
      vaginal_dryness: 3,
    };
  }

  // Recent window: three hallmark symptoms at 3 and sleep exactly at the
  // engine's >=2 boundary. Both halves of the window must retain this shape.
  return {
    depressed_mood: 1,
    irritability: 1,
    anxiety: 1,
    exhaustion: 2,
    hot_flashes: 3,
    heart_discomfort: 0,
    sleep_problems: 2,
    joint_muscle_pain: 3,
    sexual_problems: 0,
    bladder_problems: 2,
    vaginal_dryness: 3,
  };
}

function noteForDate(date: string): string | null {
  const notes: Record<string, string> = {
    '2026-03-11': 'Sleep shifted after the daylight saving time change.',
    '2026-04-15': 'First weekly check-in after starting estradiol and progesterone.',
    '2026-06-10': 'Progesterone increased from 100 mg to 200 mg.',
    '2026-06-17': 'Sleep feels steadier, but daytime energy has been lower.',
    '2026-07-08': 'Hot flashes and dryness are still persistent despite better sleep.',
  };
  return notes[date] ?? null;
}

export function buildSeedRows(options: {
  userId: string;
  timezone: string;
  days?: number;
  today?: string;
}): SeedRow[] {
  const days = options.days ?? DEFAULT_DAYS;
  if (!Number.isInteger(days) || days < 1 || days > 2_000) {
    throw new RangeError(`SEED_DAYS must be an integer between 1 and 2000; received ${days}`);
  }
  if (!isValidTimeZone(options.timezone)) {
    throw new RangeError(`Invalid IANA timezone: ${options.timezone}`);
  }

  const endDate = options.today ?? todayISO(options.timezone);
  const startDate = addDaysISO(endDate, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const date = addDaysISO(startDate, index);
    const isWednesday = dayOfWeekISO(date) === 3;
    const pulse = pulseForDate(date);
    const mrs = isWednesday ? mrsForDate(date) : null;

    return {
      user_id: options.userId,
      checkin_date: date,
      hot_flashes: mrs?.hot_flashes ?? null,
      heart_discomfort: mrs?.heart_discomfort ?? null,
      sleep_problems: mrs?.sleep_problems ?? null,
      depressed_mood: mrs?.depressed_mood ?? null,
      irritability: mrs?.irritability ?? null,
      anxiety: mrs?.anxiety ?? null,
      exhaustion: mrs?.exhaustion ?? null,
      sexual_problems: mrs?.sexual_problems ?? null,
      bladder_problems: mrs?.bladder_problems ?? null,
      vaginal_dryness: mrs?.vaginal_dryness ?? null,
      joint_muscle_pain: mrs?.joint_muscle_pain ?? null,
      dry_itchy_skin: null,
      brain_fog: null,
      irregular_periods: null,
      heavy_bleeding: null,
      misophonia: null,
      ...pulse,
      overall_wellbeing: null,
      notes: isWednesday ? noteForDate(date) : null,
      checkin_type: isWednesday ? 'full' : 'pulse',
      mrs_complete: isWednesday,
      is_backdated: date !== endDate,
      created_at: `${date}T12:00:00.000Z`,
    };
  });
}

function scoreRow(row: SeedRow): Pick<
  SymptomCheckin,
  'total_score' | 'psychological_score' | 'somatic_score' | 'urogenital_score'
> {
  const value = (key: MRSSymptomKey) => Number(row[key] ?? 0);
  const psychological_score =
    value('depressed_mood') + value('irritability') + value('anxiety') + value('exhaustion');
  const somatic_score =
    value('hot_flashes') +
    value('heart_discomfort') +
    value('sleep_problems') +
    value('joint_muscle_pain');
  const urogenital_score =
    value('sexual_problems') + value('bladder_problems') + value('vaginal_dryness');
  return {
    total_score: psychological_score + somatic_score + urogenital_score,
    psychological_score,
    somatic_score,
    urogenital_score,
  };
}

export function toEngineRows(rows: SeedRow[]): SymptomCheckin[] {
  return rows.map((row) => ({
    id: `seed-${row.checkin_date}`,
    ...row,
    ...scoreRow(row),
  }));
}

export function buildPersonalSymptomRows(
  checkins: Array<Pick<SeedRow, 'user_id' | 'checkin_date' | 'mrs_complete'> & { id: string }>,
): PersonalSymptomSeedRow[] {
  const historyCheckins = [...checkins]
    .filter((row) => row.mrs_complete)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
    .slice(-PERSONAL_HISTORY_WEEKS);

  if (historyCheckins.length !== PERSONAL_HISTORY_WEEKS) {
    throw new Error(
      `Personal symptom history requires ${PERSONAL_HISTORY_WEEKS} full check-ins; found ${historyCheckins.length}`,
    );
  }

  return PERSONAL_SYMPTOMS.flatMap((symptom) =>
    symptom.scores.flatMap((score, index) => {
      if (score === null) return [];
      const checkin = historyCheckins[index];
      return [{
        user_id: checkin.user_id,
        checkin_id: checkin.id,
        symptom_key: symptom.symptomId,
        severity: null,
        severity_score: score,
        created_at: `${checkin.checkin_date}T12:05:00.000Z`,
      }];
    }),
  );
}

function assertSeedInvariants(rows: SeedRow[], timezone: string): void {
  if (rows.length === 0) throw new Error('Seed generated no rows');
  const dates = new Set(rows.map((row) => row.checkin_date));
  if (dates.size !== rows.length) throw new Error('Seed contains duplicate calendar dates');

  for (let index = 1; index < rows.length; index++) {
    if (rows[index].checkin_date !== addDaysISO(rows[index - 1].checkin_date, 1)) {
      throw new Error(`Seed date gap before ${rows[index].checkin_date}`);
    }
  }

  for (const row of rows) {
    if (!row.energy_level || !row.mood_level || !row.sleep_quality) {
      throw new Error(`Missing pulse channel on ${row.checkin_date}`);
    }
    const isWednesday = dayOfWeekISO(row.checkin_date) === 3;
    if (isWednesday !== (row.checkin_type === 'full')) {
      throw new Error(`Check-in type does not match Wednesday rule on ${row.checkin_date}`);
    }
    if (isWednesday) {
      if (!row.mrs_complete || MRS_CANONICAL_KEYS.some((key) => row[key] === null)) {
        throw new Error(`Incomplete Wednesday MRS on ${row.checkin_date}`);
      }
      if (scoreRow(row).psychological_score >= 8) {
        throw new Error(`Safeguarding boundary exceeded on ${row.checkin_date}`);
      }
    } else if (row.mrs_complete || MRS_CANONICAL_KEYS.some((key) => row[key] !== null)) {
      throw new Error(`Pulse row contains MRS data on ${row.checkin_date}`);
    }
  }

  const engineRows = toEngineRows(rows);
  const clusters = analyzeSymptomClusters({
    checkins: engineRows,
    extendedSymptoms: [],
    timezone,
  });
  if (!clusters.some((insight) => insight.id === TARGET_CLUSTER_ID)) {
    throw new Error(`${TARGET_CLUSTER_ID} did not pass the local cluster engine`);
  }
  const safeguarding = analyzeSafeguarding({ checkins: engineRows, timezone });
  if (safeguarding.length > 0) {
    throw new Error(`Unexpected safeguarding output: ${safeguarding.map((item) => item.id).join(', ')}`);
  }
}

export function summarizeSeed(rows: SeedRow[], timezone: string): SeedSummary {
  assertSeedInvariants(rows, timezone);
  const engineRows = toEngineRows(rows);
  const fullRows = rows.filter((row) => row.mrs_complete);
  const recentStart = addDaysISO(rows[rows.length - 1].checkin_date, -30);
  return {
    timezone,
    startDate: rows[0].checkin_date,
    endDate: rows[rows.length - 1].checkin_date,
    totalRows: rows.length,
    pulseRows: rows.filter((row) => row.checkin_type === 'pulse').length,
    fullRows: fullRows.length,
    pulseCompleteRows: rows.filter(
      (row) => row.energy_level !== null && row.mood_level !== null && row.sleep_quality !== null,
    ).length,
    wednesdays: fullRows.map((row) => row.checkin_date),
    mrsSpanDays:
      fullRows.length > 1
        ? daysBetweenISO(fullRows[0].checkin_date, fullRows[fullRows.length - 1].checkin_date)
        : 0,
    mrsInRecentWindow: fullRows.filter((row) => row.checkin_date >= recentStart).length,
    clusterIds: analyzeSymptomClusters({
      checkins: engineRows,
      extendedSymptoms: [],
      timezone,
    }).map((insight) => insight.id),
    safeguardingIds: analyzeSafeguarding({ checkins: engineRows, timezone }).map(
      (insight) => insight.id,
    ),
    trendIds: analyzeTrends({
      checkins: engineRows,
      medications: [],
      labResults: [],
      timezone,
    }).map((insight) => insight.id),
  };
}

function severity(score: number, bands: [number, number, number]): 'none' | 'mild' | 'moderate' | 'severe' {
  if (score >= bands[2]) return 'severe';
  if (score >= bands[1]) return 'moderate';
  if (score >= bands[0]) return 'mild';
  return 'none';
}

function assessmentForRow(row: SeedRow & { id: string }) {
  const scores = scoreRow(row);
  return {
    user_id: row.user_id,
    instrument_id: 'mrs',
    checkin_id: row.id,
    total_score: scores.total_score,
    total_severity: severity(scores.total_score, [5, 9, 16]),
    subscale_scores: {
      psychological: {
        score: scores.psychological_score,
        severity: severity(scores.psychological_score, [4, 8, 12]),
      },
      somatic: {
        score: scores.somatic_score,
        severity: severity(scores.somatic_score, [4, 8, 12]),
      },
      urogenital: {
        score: scores.urogenital_score,
        severity: severity(scores.urogenital_score, [3, 6, 9]),
      },
    },
    item_responses: {
      depressed_mood: row.depressed_mood,
      irritability: row.irritability,
      anxiety: row.anxiety,
      physical_mental_exhaustion: row.exhaustion,
      hot_flashes_sweating: row.hot_flashes,
      heart_discomfort: row.heart_discomfort,
      sleep_problems: row.sleep_problems,
      joint_muscular_discomfort: row.joint_muscle_pain,
      sexual_problems: row.sexual_problems,
      bladder_problems: row.bladder_problems,
      vaginal_dryness: row.vaginal_dryness,
    },
    assessed_at: row.created_at,
    created_at: row.created_at,
  };
}

function printSummary(summary: SeedSummary, mode: string): void {
  console.log('\n=== Seed summary ===');
  console.log(`Mode: ${mode}`);
  console.log(`Timezone: ${summary.timezone}`);
  console.log(`Date range: ${summary.startDate} → ${summary.endDate}`);
  console.log(`Total rows: ${summary.totalRows}`);
  console.log(`Pulse rows (checkin_type=pulse): ${summary.pulseRows}`);
  console.log(`Full MRS rows (Wednesdays): ${summary.fullRows}`);
  console.log(`Days with pulse fields populated: ${summary.pulseCompleteRows} / ${summary.totalRows}`);
  console.log(`MRS span (days): ${summary.mrsSpanDays}`);
  console.log(`MRS in engine's recent window: ${summary.mrsInRecentWindow}`);
  console.log(`Wednesdays: ${summary.wednesdays.join(', ')}`);
  console.log(`Cluster engine: ${summary.clusterIds.join(', ') || 'none'}`);
  console.log(`Safeguarding: ${summary.safeguardingIds.join(', ') || 'none'}`);
  console.log(`Trend engine: ${summary.trendIds.join(', ') || 'none'}`);
}

async function main(): Promise<void> {
  const envPath = resolve(process.cwd(), '.env.local');
  if (existsSync(envPath)) loadEnvFile(envPath);

  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const dryRun = args.has('--dry-run') || !apply;
  const offlinePreview = args.has('--offline-preview');
  const days = Number(process.env.SEED_DAYS ?? DEFAULT_DAYS);

  if (offlinePreview) {
    const timezone = process.env.SEED_TIMEZONE ?? DEFAULT_TIMEZONE;
    const rows = buildSeedRows({
      userId: 'offline-preview',
      timezone,
      days,
      today: process.env.SEED_TODAY,
    });
    printSummary(summarizeSeed(rows, timezone), 'offline preview (no Supabase access)');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SEED_USER_EMAIL;
  if (!supabaseUrl || !serviceRoleKey || !email) {
    throw new Error(
      'SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, and SEED_USER_EMAIL are required',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,timezone')
    .eq('email', email);
  if (profileError) throw new Error(`Profile lookup failed: ${profileError.message}`);
  if (!profiles || profiles.length !== 1) {
    throw new Error(`Expected exactly one profile for ${email}; found ${profiles?.length ?? 0}`);
  }

  const profile = profiles[0];
  const timezone = isValidTimeZone(profile.timezone) ? profile.timezone : DEFAULT_TIMEZONE;
  const rows = buildSeedRows({ userId: profile.id, timezone, days });
  const summary = summarizeSeed(rows, timezone);

  const { count: overlapCount, error: overlapError } = await supabase
    .from('symptom_checkins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .gte('checkin_date', summary.startDate)
    .lte('checkin_date', summary.endDate);
  if (overlapError) throw new Error(`Overlap check failed: ${overlapError.message}`);

  printSummary(summary, dryRun ? 'dry run' : 'apply');
  console.log(`Existing rows in target range: ${overlapCount ?? 0}`);
  console.log(`Target user: ${profile.email}`);
  if (dryRun) return;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const { error } = await supabase
      .from('symptom_checkins')
      .upsert(batch, { onConflict: 'user_id,checkin_date' });
    if (error) throw new Error(`Check-in upsert failed: ${error.message}`);
  }

  const { data: fetched, error: fetchError } = await supabase
    .from('symptom_checkins')
    .select('*')
    .eq('user_id', profile.id)
    .gte('checkin_date', summary.startDate)
    .lte('checkin_date', summary.endDate)
    .order('checkin_date');
  if (fetchError) throw new Error(`Seed verification fetch failed: ${fetchError.message}`);
  if (!fetched || fetched.length !== rows.length) {
    throw new Error(`Expected ${rows.length} seeded rows; fetched ${fetched?.length ?? 0}`);
  }

  const checkinIds = fetched.map((row) => row.id as string);
  for (let index = 0; index < checkinIds.length; index += 50) {
    const ids = checkinIds.slice(index, index + 50);
    const { error: extendedError } = await supabase
      .from('extended_symptom_logs')
      .delete()
      .in('checkin_id', ids);
    if (extendedError) throw new Error(`Extended-log cleanup failed: ${extendedError.message}`);

    const { error: assessmentDeleteError } = await supabase
      .from('assessment_results')
      .delete()
      .in('checkin_id', ids);
    if (assessmentDeleteError) {
      throw new Error(`Assessment cleanup failed: ${assessmentDeleteError.message}`);
    }
  }

  const fullFetched = fetched.filter((row) => row.mrs_complete) as Array<SeedRow & { id: string }>;
  const personalSymptomRows = buildPersonalSymptomRows(
    fetched as Array<SeedRow & { id: string }>,
  );

  const { error: selectionError } = await supabase
    .from('user_symptom_selections')
    .upsert(
      PERSONAL_SYMPTOMS.map((symptom) => ({
        user_id: profile.id,
        symptom_id: symptom.symptomId,
        is_watch_symptom: symptom.isWatchSymptom,
      })),
      {
        onConflict: 'user_id,symptom_id',
        ignoreDuplicates: true,
      },
    );
  if (selectionError) {
    throw new Error(`Personal symptom selection rebuild failed: ${selectionError.message}`);
  }

  for (let index = 0; index < personalSymptomRows.length; index += BATCH_SIZE) {
    const batch = personalSymptomRows.slice(index, index + BATCH_SIZE);
    const { error: personalHistoryError } = await supabase
      .from('extended_symptom_logs')
      .upsert(batch, { onConflict: 'checkin_id,symptom_key' });
    if (personalHistoryError) {
      throw new Error(`Personal symptom history rebuild failed: ${personalHistoryError.message}`);
    }
  }

  const { error: assessmentInsertError } = await supabase
    .from('assessment_results')
    .insert(fullFetched.map(assessmentForRow));
  if (assessmentInsertError) {
    throw new Error(`Assessment rebuild failed: ${assessmentInsertError.message}`);
  }

  const { error: dismissalError } = await supabase
    .from('dismissed_insights')
    .delete()
    .eq('user_id', profile.id)
    .eq('insight_id', TARGET_CLUSTER_ID);
  if (dismissalError) throw new Error(`Dismissal cleanup failed: ${dismissalError.message}`);

  const fetchedEngineRows = fetched as SymptomCheckin[];
  const extendedEngineRows = personalSymptomRows.map((row, index) => ({
    id: `seed-extended-${index}`,
    ...row,
  }));
  const clusterIds = analyzeSymptomClusters({
    checkins: fetchedEngineRows,
    extendedSymptoms: extendedEngineRows,
    timezone,
  }).map((insight) => insight.id);
  if (clusterIds.length !== 1 || clusterIds[0] !== TARGET_CLUSTER_ID) {
    throw new Error(`Post-seed engine verification failed; clusters: ${clusterIds.join(', ') || 'none'}`);
  }

  console.log(
    `\n✓ Ready — ${TARGET_CLUSTER_ID} and ${personalSymptomRows.length} personal symptom logs verified.`,
  );
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
