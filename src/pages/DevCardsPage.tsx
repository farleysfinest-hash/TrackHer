/**
 * Dev-only visual harness for the two highest-stakes cards in the app.
 *
 * Why this exists: `bleeding_red_flag` and `safeguarding` only fire for accounts in states
 * no test account is in — postmenopausal with recent bleeding, or three check-ins into a
 * rising mood/exhaustion trajectory. Both had full unit coverage and had never been rendered
 * in a browser. Copy defects, layout breaks and truncation do not show up in a snapshot of a
 * string.
 *
 * This page builds synthetic inputs and runs them through the **real** engine functions
 * (`analyzeBleedingRedFlag`, `analyzeSafeguarding`) rather than hand-writing `Insight`
 * literals. The copy you see here is the copy a user would see, including every conditional
 * branch in `buildBody`. It is rendered through the same components the real surfaces use:
 * `InsightCard` for the bleeding flag (as InsightsPage does) and `SafeguardingCard` for the
 * safeguarding card (as DashboardLayout does).
 *
 * Route is registered only under `import.meta.env.DEV`, so this never reaches a build.
 *
 * Expected console noise: the cards call `markInsightAsViewed` on mount, which fires the
 * `merge_ui_state` RPC. Unauthenticated, that now raises by design (CODE_AUDIT H2), so you
 * will see "Failed to persist ui_state patch". That is the fix working, not a defect.
 */

import { useState, type ReactNode } from 'react';
import type { Medication, Profile, SymptomCheckin } from '../types/database';
import type { Insight } from '../engine/types';
import { analyzeBleedingRedFlag } from '../engine/bleedingRedFlag';
import { analyzeSafeguarding } from '../engine/safeguarding';
import { InsightCard } from '../components/insights/InsightCard';
import { SafeguardingCard } from '../components/insights/SafeguardingCard';
import { addDaysISO, todayISO } from '../utils/localDate';

const TZ = 'UTC';
const TODAY = todayISO(TZ);

// Partial casts match the convention in engine/__tests__/bleedingRedFlag.test.ts: these
// analyzers read a known handful of fields, and spelling out all ~40 profile columns would
// obscure which ones actually drive the branch.

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'dev-user',
    straw_stage: '+1c',
    periods_status: 'stopped',
    last_period_date: null,
    has_uterus: true,
    ...overrides,
  } as Profile;
}

function makeCheckin(overrides: Partial<SymptomCheckin>): SymptomCheckin {
  return {
    id: `c-${overrides.checkin_date}-${Math.random().toString(36).slice(2, 7)}`,
    bleeding_flow: null,
    mrs_complete: false,
    ...overrides,
  } as SymptomCheckin;
}

function makeMedication(overrides: Partial<Medication>): Medication {
  return {
    id: `med-${Math.random().toString(36).slice(2, 7)}`,
    medication_name: 'Fixture medication',
    is_active: true,
    start_date: '2025-01-01',
    end_date: null,
    frequency: 'daily',
    ...overrides,
  } as Medication;
}

// ---------------------------------------------------------------------------
// Bleeding red flag — one scenario per branch of buildBody()
// ---------------------------------------------------------------------------

const estrogenPatch = makeMedication({
  medication_name: 'Estradiol patch (Climara)',
  hormone_category: 'estrogen',
  delivery_method: 'patch',
  frequency: 'weekly',
});

const continuousProgesterone = makeMedication({
  medication_name: 'Progesterone (Prometrium)',
  hormone_category: 'progesterone',
  delivery_method: 'oral_capsule',
  frequency: 'daily',
});

const cyclicProgesterone = makeMedication({
  medication_name: 'Progesterone (Utrogestan), cyclic',
  hormone_category: 'progesterone',
  delivery_method: 'oral_capsule',
  frequency: 'cyclic',
});

const vaginalEstrogen = makeMedication({
  medication_name: 'Estriol vaginal cream',
  hormone_category: 'estrogen',
  delivery_method: 'vaginal_cream',
  frequency: 'three_times_weekly',
});

interface BleedingScenario {
  key: string;
  label: string;
  note: string;
  profile: Profile;
  checkins: SymptomCheckin[];
  medications: Medication[];
}

const oneSpot = [makeCheckin({ checkin_date: addDaysISO(TODAY, -5), bleeding_flow: 'spotting' })];

const severalDays = [
  makeCheckin({ checkin_date: addDaysISO(TODAY, -3), bleeding_flow: 'moderate' }),
  makeCheckin({ checkin_date: addDaysISO(TODAY, -4), bleeding_flow: 'heavy' }),
  makeCheckin({ checkin_date: addDaysISO(TODAY, -40), bleeding_flow: 'light' }),
];

const BLEEDING_SCENARIOS: BleedingScenario[] = [
  {
    key: 'no-ht',
    label: 'No hormone therapy · single day of spotting',
    note: 'The likely-cause paragraph should be omitted entirely — no progesterone mention.',
    profile: makeProfile(),
    checkins: oneSpot,
    medications: [],
  },
  {
    key: 'estrogen-plus-progestogen',
    label: 'Systemic estrogen + continuous progestogen · 2 days in window',
    note: 'Should name inadequate progestogen as a common, fixable cause. Note the third bleed at -40d is inside the 90-day lookback, so the count should read 3.',
    profile: makeProfile(),
    checkins: severalDays,
    medications: [estrogenPatch, continuousProgesterone],
  },
  {
    key: 'unopposed-estrogen',
    label: 'Systemic estrogen, no progestogen recorded · has uterus',
    note: 'Should raise unopposed systemic estrogen specifically and promptly.',
    profile: makeProfile(),
    checkins: oneSpot,
    medications: [estrogenPatch],
  },
  {
    key: 'cyclic',
    label: 'Cyclic progestogen · expected withdrawal bleed',
    note: 'Should acknowledge a scheduled bleed is not unusual before continuing.',
    profile: makeProfile(),
    checkins: oneSpot,
    medications: [estrogenPatch, cyclicProgesterone],
  },
  {
    key: 'vaginal-only',
    label: 'Local vaginal estrogen only',
    note: 'Local estrogen is not systemic — the progesterone-opposition paragraph must NOT appear.',
    profile: makeProfile(),
    checkins: oneSpot,
    medications: [vaginalEstrogen],
  },
  {
    key: 'surgical',
    label: 'Surgical menopause · no uterus flag set',
    note: 'Fires on the surgical stage. has_uterus is false, so the unopposed-estrogen paragraph should be suppressed even without a progestogen.',
    profile: makeProfile({ straw_stage: 'surgical', has_uterus: false }),
    checkins: oneSpot,
    medications: [estrogenPatch],
  },
  {
    key: 'advanced-by-time',
    label: 'Stored stage −1, but last period 26 months ago',
    note: 'The stage should advance on elapsed time (CODE_AUDIT C3) and fire. If this section is empty, resolveCurrentStrawStage is not advancing.',
    profile: makeProfile({
      straw_stage: '-1',
      periods_status: 'stopped',
      last_period_date: addDaysISO(TODAY, -790),
    }),
    checkins: oneSpot,
    medications: [],
  },
];

// ---------------------------------------------------------------------------
// Safeguarding — tier 2 requires a rising psych subscale AND floor loss
// ---------------------------------------------------------------------------

/**
 * Tier 2 gates on `computeRising` (three complete check-ins, latest >= 12, risen >= 3,
 * monotonic-ish) plus either floor loss or withdrawal. This builds the floor-loss route:
 * four pulse days in the last week all worse than the worst of four baseline days a month back.
 */
function safeguardingCheckins(): SymptomCheckin[] {
  const psych = (date: string, depressed: number, irritability: number, anxiety: number, exhaustion: number) =>
    makeCheckin({
      checkin_date: date,
      mrs_complete: true,
      depressed_mood: depressed as SymptomCheckin['depressed_mood'],
      irritability: irritability as SymptomCheckin['irritability'],
      anxiety: anxiety as SymptomCheckin['anxiety'],
      exhaustion: exhaustion as SymptomCheckin['exhaustion'],
      energy_level: 2,
      mood_level: 2,
      sleep_quality: 2,
    });

  const pulse = (date: string, level: number) =>
    makeCheckin({
      checkin_date: date,
      energy_level: level,
      mood_level: level,
      sleep_quality: level,
    });

  return [
    // Rising psych subscale: 9 → 11 → 13
    psych(addDaysISO(TODAY, -14), 2, 2, 2, 3),
    psych(addDaysISO(TODAY, -7), 3, 3, 2, 3),
    psych(TODAY, 4, 3, 3, 3),

    // Recent week — four pulse days, all low
    pulse(addDaysISO(TODAY, -1), 2),
    pulse(addDaysISO(TODAY, -2), 2),
    pulse(addDaysISO(TODAY, -3), 2),

    // Baseline month back — four pulse days, all higher than the recent best
    pulse(addDaysISO(TODAY, -28), 4),
    pulse(addDaysISO(TODAY, -30), 4),
    pulse(addDaysISO(TODAY, -32), 4),
    pulse(addDaysISO(TODAY, -34), 4),
  ];
}

// ---------------------------------------------------------------------------

function Section({
  title,
  note,
  insights,
  render,
}: {
  title: string;
  note: string;
  insights: Insight[];
  render: (insight: Insight) => ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg text-sage-800">{title}</h2>
        <p className="mt-1 text-sm text-sage-500">{note}</p>
      </div>
      {insights.length === 0 ? (
        <div className="rounded-lg border border-dashed border-alert-700/40 bg-alert-700/5 p-4 text-sm text-alert-700">
          No insight produced. If this scenario was expected to fire, that is the finding.
        </div>
      ) : (
        insights.map((insight) => <div key={insight.id}>{render(insight)}</div>)
      )}
    </section>
  );
}

export function DevCardsPage() {
  const [narrow, setNarrow] = useState(false);

  const safeguardingResults = analyzeSafeguarding({
    checkins: safeguardingCheckins(),
    timezone: TZ,
  });
  const safeguarding = safeguardingResults.filter((i) => i.category === 'safeguarding');
  const otherSafeguarding = safeguardingResults.filter((i) => i.category !== 'safeguarding');

  return (
    <div className="min-h-screen bg-sand-100 p-6">
      <div className={`mx-auto space-y-10 ${narrow ? 'max-w-sm' : 'max-w-3xl'}`}>
        <header className="space-y-2">
          <h1 className="font-display text-2xl text-sage-800">Card fixtures (dev only)</h1>
          <p className="text-sm text-sage-600">
            Real engine output from synthetic inputs. Today is {TODAY} ({TZ}).
          </p>
          <button
            type="button"
            onClick={() => setNarrow((v) => !v)}
            className="rounded-lg border border-sage-300 px-3 py-1.5 text-sm text-sage-700"
          >
            {narrow ? 'Desktop width' : 'Phone width (384px)'}
          </button>
        </header>

        <div className="space-y-10">
          <h2 className="font-display text-xl text-sage-800">Bleeding red flag</h2>
          {BLEEDING_SCENARIOS.map((scenario) => (
            <Section
              key={scenario.key}
              title={scenario.label}
              note={scenario.note}
              insights={analyzeBleedingRedFlag({
                profile: scenario.profile,
                checkins: scenario.checkins,
                medications: scenario.medications,
                today: TODAY,
              })}
              render={(insight) => <InsightCard insight={insight} onDismiss={() => {}} />}
            />
          ))}
        </div>

        <div className="space-y-10">
          <h2 className="font-display text-xl text-sage-800">Safeguarding</h2>
          <Section
            title="Tier 2 — rising psych subscale with floor loss"
            note="Rendered through SafeguardingCard, as DashboardLayout does. Check that the crisis resources are present and the links are tappable."
            insights={safeguarding}
            render={(insight) => <SafeguardingCard insight={insight} onDismiss={() => {}} />}
          />
          <Section
            title="Non-safeguarding output from the same run"
            note="Tier 1 psych_trajectory and cardiac_persistence render as ordinary insight cards. Empty here is expected when tier 2 supersedes tier 1."
            insights={otherSafeguarding}
            render={(insight) => <InsightCard insight={insight} onDismiss={() => {}} />}
          />
        </div>
      </div>
    </div>
  );
}
