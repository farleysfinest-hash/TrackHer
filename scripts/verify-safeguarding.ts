/**
 * Prompt 09 §9 — programmatic safeguarding verification.
 * Run: npx tsx scripts/verify-safeguarding.ts
 */
import { analyzeSafeguarding } from '../src/engine/safeguarding';
import { getPriorityBadgeVariant } from '../src/utils/insightHelpers';
import type { SymptomCheckin } from '../src/types/database';
import { addDaysISO, todayISO } from '../src/utils/localDate';

const TZ = 'America/Los_Angeles';
const TODAY = todayISO(TZ);

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function makeCheckin(
  date: string,
  overrides: Partial<SymptomCheckin> & {
    depressed_mood?: number | null;
    irritability?: number | null;
    anxiety?: number | null;
    exhaustion?: number | null;
  },
): SymptomCheckin {
  const psych = {
    depressed_mood: overrides.depressed_mood ?? 1,
    irritability: overrides.irritability ?? 1,
    anxiety: overrides.anxiety ?? 1,
    exhaustion: overrides.exhaustion ?? 1,
  };
  const psychSum =
    (psych.depressed_mood ?? 0) +
    (psych.irritability ?? 0) +
    (psych.anxiety ?? 0) +
    (psych.exhaustion ?? 0);

  return {
    id: `test-${date}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: 'test-user',
    checkin_date: date,
    hot_flashes: 1,
    heart_discomfort: 1,
    sleep_problems: 1,
    ...psych,
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
    mrs_complete: overrides.mrs_complete ?? true,
    total_score: 11,
    somatic_score: 3,
    psychological_score: psychSum,
    urogenital_score: 3,
    overall_wellbeing: null,
    energy_level: overrides.energy_level ?? 4,
    mood_level: overrides.mood_level ?? 4,
    sleep_quality: overrides.sleep_quality ?? 4,
    notes: null,
    is_backdated: false,
    created_at: `${date}T12:00:00Z`,
    ...overrides,
  };
}

function completePsych(
  date: string,
  scores: [number, number, number, number],
  extra: Partial<SymptomCheckin> = {},
): SymptomCheckin {
  const [depressed_mood, irritability, anxiety, exhaustion] = scores;
  return makeCheckin(date, {
    depressed_mood,
    irritability,
    anxiety,
    exhaustion,
    mrs_complete: true,
    ...extra,
  });
}

function pulseRow(date: string, energy: number, mood: number, sleep: number): SymptomCheckin {
  return makeCheckin(date, {
    mrs_complete: false,
    depressed_mood: null,
    irritability: null,
    anxiety: null,
    exhaustion: null,
    checkin_type: 'pulse',
    energy_level: energy,
    mood_level: mood,
    sleep_quality: sleep,
    psychological_score: 0,
  });
}

function ids(results: ReturnType<typeof analyzeSafeguarding>): string[] {
  return results.map((i) => i.id);
}

function hasCategory(
  results: ReturnType<typeof analyzeSafeguarding>,
  category: string,
): boolean {
  return results.some((i) => i.category === category);
}

console.log('\n=== Prompt 09 safeguarding verification ===\n');
console.log(`Reference today: ${TODAY} (${TZ})\n`);

// 1 — Stable moderate psych: no Tier 2 (not severe+rising+corroborated)
console.log('1. Stable account — no spurious Tier 2');
{
  const checkins = [
    completePsych(addDaysISO(TODAY, -7), [2, 2, 2, 2]),
    completePsych(addDaysISO(TODAY, -14), [2, 2, 2, 3]),
    completePsych(addDaysISO(TODAY, -21), [2, 3, 2, 2]),
    completePsych(addDaysISO(TODAY, -28), [2, 2, 3, 2]),
  ];
  const results = analyzeSafeguarding({ checkins, timezone: TZ });
  assert(!hasCategory(results, 'safeguarding'), 'no Tier 2 on stable moderate data');
}

// 2 — Incomplete check-in trap: fake low psych_score must not pull subscale down
console.log('\n2. Incomplete check-in trap');
{
  const checkins = [
    // Incomplete with NULL psych — psychological_score=0 in DB but must be excluded
    makeCheckin(addDaysISO(TODAY, -3), {
      mrs_complete: false,
      depressed_mood: null,
      irritability: null,
      anxiety: null,
      exhaustion: null,
      psychological_score: 0,
    }),
    completePsych(addDaysISO(TODAY, -10), [1, 1, 1, 1]),
    completePsych(addDaysISO(TODAY, -17), [1, 1, 1, 1]),
  ];
  const results = analyzeSafeguarding({ checkins, timezone: TZ });
  assert(!hasCategory(results, 'psych_trajectory'), 'incomplete row does not create Tier 1');
  assert(!hasCategory(results, 'safeguarding'), 'incomplete row does not create Tier 2');
}

// 3 — Tier 1 fires
console.log('\n3. Tier 1 — two consecutive psych >= 8');
{
  const checkins = [
    completePsych(addDaysISO(TODAY, -7), [2, 2, 2, 3]), // 9
    completePsych(addDaysISO(TODAY, -14), [2, 3, 2, 2]), // 9
  ];
  const results = analyzeSafeguarding({ checkins, timezone: TZ });
  assert(ids(results).includes('safeguard-psych-t1'), 'Tier 1 fires');
  const t1 = results.find((i) => i.id === 'safeguard-psych-t1');
  assert(t1?.category === 'psych_trajectory', 'Tier 1 is psych_trajectory (rose card path)');
}

// 4 — Tier 2 needs conjunction: rising alone insufficient
console.log('\n4. Tier 2 conjunction');
{
  const d0 = addDaysISO(TODAY, -7);
  const d1 = addDaysISO(TODAY, -14);
  const d2 = addDaysISO(TODAY, -21);
  const risingOnly = [
    completePsych(d0, [3, 3, 3, 3]), // 12 severe
    completePsych(d1, [3, 2, 3, 2]), // 10
    completePsych(d2, [2, 2, 2, 3]), // 9 — net rise 3
  ];
  // Healthy pulse every day for 41 days
  const pulseHistory: SymptomCheckin[] = [];
  for (let i = 0; i <= 41; i++) {
    pulseHistory.push(pulseRow(addDaysISO(TODAY, -i), 4, 4, 4));
  }
  const noTier2 = analyzeSafeguarding({
    checkins: [...risingOnly, ...pulseHistory],
    timezone: TZ,
  });
  assert(!hasCategory(noTier2, 'safeguarding'), 'rising alone with healthy pulse → no Tier 2');

  // Withdrawal: drop recent pulse logging
  const withdrawalPulse: SymptomCheckin[] = [];
  for (let i = 14; i <= 41; i++) {
    withdrawalPulse.push(pulseRow(addDaysISO(TODAY, -i), 4, 4, 4));
  }
  // Only 1 pulse day in last 14 days (baseline had ~28 days / 4 = 7 per week)
  withdrawalPulse.push(pulseRow(addDaysISO(TODAY, -1), 2, 2, 2));

  const withTier2 = analyzeSafeguarding({
    checkins: [...risingOnly, ...withdrawalPulse],
    timezone: TZ,
  });
  assert(hasCategory(withTier2, 'safeguarding'), 'rising + withdrawal → Tier 2 fires');
}

// 5 — Escalation step in id
console.log('\n5. Escalation step encoding');
{
  const checkins = [
    completePsych(addDaysISO(TODAY, -7), [4, 4, 4, 4]), // 16 → step 2
    completePsych(addDaysISO(TODAY, -14), [3, 3, 3, 2]),
    completePsych(addDaysISO(TODAY, -21), [2, 2, 2, 3]),
  ];
  const withdrawalPulse: SymptomCheckin[] = [];
  for (let i = 14; i <= 41; i++) {
    withdrawalPulse.push(pulseRow(addDaysISO(TODAY, -i), 4, 4, 4));
  }
  withdrawalPulse.push(pulseRow(addDaysISO(TODAY, -1), 1, 1, 1));
  const results = analyzeSafeguarding({
    checkins: [...checkins, ...withdrawalPulse],
    timezone: TZ,
  });
  assert(ids(results).includes('safeguard-psych-t2-s2'), 'c3=16 → escalation step 2');
}

// 6 — Cardiac persistence
console.log('\n6. Cardiac persistence');
{
  const checkins = [
    completePsych(addDaysISO(TODAY, -7), [1, 1, 1, 1], { heart_discomfort: 3 }),
    completePsych(addDaysISO(TODAY, -14), [1, 1, 1, 1], { heart_discomfort: 3 }),
    completePsych(addDaysISO(TODAY, -21), [1, 1, 1, 1], { heart_discomfort: 3 }),
    completePsych(addDaysISO(TODAY, -28), [1, 1, 1, 1], { heart_discomfort: 1 }),
  ];
  const results = analyzeSafeguarding({ checkins, timezone: TZ });
  assert(ids(results).includes('cardiac-persistence'), 'cardiac fires on 3/4 high');
  const cardiac = results.find((i) => i.id === 'cardiac-persistence');
  assert(cardiac?.category === 'cardiac_persistence', 'cardiac is ordinary rose path');
}

// 7 — Badge variants de-traffic-lighted
console.log('\n7. Insight badges — no danger/warning/success');
{
  assert(getPriorityBadgeVariant('high') === 'attention', 'high → attention');
  assert(getPriorityBadgeVariant('medium') === 'review', 'medium → review');
  assert(getPriorityBadgeVariant('positive') === 'affirmative', 'positive → affirmative');
  assert(getPriorityBadgeVariant('low') === 'reference', 'low → reference');
}

// 8 — First-ever check-in cannot trigger Tier 2
console.log('\n8. No Tier 2 on first check-in');
{
  const results = analyzeSafeguarding({
    checkins: [completePsych(TODAY, [4, 4, 4, 4])],
    timezone: TZ,
  });
  assert(!hasCategory(results, 'safeguarding'), 'single check-in → no Tier 2');
}

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
