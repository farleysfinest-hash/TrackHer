/**
 * Postmenopausal bleeding detection.
 *
 * Once the menopause transition is complete, any vaginal bleeding — including spotting —
 * warrants prompt clinical evaluation to exclude endometrial pathology. Endometrial carcinoma
 * is identified in roughly 9% of postmenopausal bleeding presentations (ACOG Committee Opinion
 * 734), and evaluation is transvaginal ultrasound and/or endometrial biopsy. It is not a
 * hormone-titration question.
 *
 * This module exists because the symptom engine would otherwise read the same bleeding as
 * evidence of a high estrogen-to-progesterone pattern and suggest adjusting doses, which could
 * delay diagnosis.
 *
 * Two deliberate design choices:
 *
 * 1. Spotting counts. The guidance is any bleeding, not heavy bleeding.
 * 2. Scheduled withdrawal bleeds on cyclic (sequential) progestogen are expected, so the copy
 *    distinguishes them rather than crying wolf — but the card still appears, because only the
 *    user knows whether a given bleed was the scheduled one.
 */

import type { Medication, SymptomCheckin, Profile, BleedingFlow } from '../types/database';
import { resolveCurrentStrawStage, type StrawStageCode } from '../lib/strawStaging';
import type { Insight } from './types';
import { INSIGHT_DISCLAIMER } from './types';
import { daysBetweenISO } from '../utils/localDate';

/**
 * Stages at which bleeding is no longer expected.
 *
 * `+1a` begins at 12 months of amenorrhea, which is the threshold the postmenopausal-bleeding
 * guidance is written against. Surgical and iatrogenic menopause are included because bleeding
 * after bilateral oophorectomy or treatment-induced menopause is equally unexpected.
 *
 * `-1` (late transition) is deliberately excluded: skipped periods and irregular, sometimes
 * heavy bleeding are characteristic there, and flagging it would fire constantly.
 */
const POSTMENOPAUSAL_STAGES: readonly StrawStageCode[] = [
  '+1a',
  '+1b',
  '+1c',
  '+2',
  'surgical',
  'iatrogenic',
];

/** Bleeding of any volume counts; only an explicit "none" clears it. */
const BLEEDING_VALUES: readonly BleedingFlow[] = ['spotting', 'light', 'moderate', 'heavy'];

/**
 * Routes that deliver enough estrogen systemically to stimulate the endometrium, and therefore
 * to need progestogen opposition in a woman with a uterus. Local vaginal preparations are
 * excluded: low-dose vaginal estrogen is generally not considered to require a progestogen, so
 * offering a progesterone explanation to someone using only vaginal estriol would mislead.
 */
const SYSTEMIC_ESTROGEN_METHODS = new Set([
  'patch',
  'gel',
  'cream',
  'spray',
  'oral_tablet',
  'oral_capsule',
  'injection',
  'pellet',
  'troche',
  'sublingual',
]);

/** How far back to look. Long enough to catch an episode the user has not acted on yet. */
const LOOKBACK_DAYS = 90;

export interface BleedingRedFlagInput {
  profile: Profile | null;
  checkins: SymptomCheckin[];
  medications: Medication[];
  today: string;
}

export function isPostmenopausalStage(stage: StrawStageCode | null | undefined): boolean {
  if (!stage) return false;
  return POSTMENOPAUSAL_STAGES.includes(stage);
}

/**
 * True when the user takes a progestogen on a cyclic schedule, which produces an expected
 * monthly withdrawal bleed. Continuous-combined regimens do not.
 */
export function hasCyclicProgestogen(medications: Medication[], today: string): boolean {
  return medications.some(
    (med) =>
      med.is_active &&
      med.frequency === 'cyclic' &&
      (med.hormone_category === 'progesterone' || med.hormone_category === 'combination') &&
      med.start_date <= today &&
      (med.end_date === null || med.end_date >= today),
  );
}

function isCurrent(med: Medication, today: string): boolean {
  return (
    med.is_active && med.start_date <= today && (med.end_date === null || med.end_date >= today)
  );
}

/** Systemic estrogen therapy — the kind that needs progestogen opposition with a uterus. */
export function hasSystemicEstrogen(medications: Medication[], today: string): boolean {
  return medications.some(
    (med) =>
      isCurrent(med, today) &&
      (med.hormone_category === 'estrogen' || med.hormone_category === 'combination') &&
      SYSTEMIC_ESTROGEN_METHODS.has(med.delivery_method),
  );
}

/** Any progestogen on board, cyclic or continuous. Combination products carry their own. */
export function hasAnyProgestogen(medications: Medication[], today: string): boolean {
  return medications.some(
    (med) =>
      isCurrent(med, today) &&
      (med.hormone_category === 'progesterone' || med.hormone_category === 'combination'),
  );
}

function bleedingCheckins(checkins: SymptomCheckin[], today: string): SymptomCheckin[] {
  return checkins
    .filter((c) => daysBetweenISO(c.checkin_date, today) <= LOOKBACK_DAYS)
    .filter((c) => daysBetweenISO(c.checkin_date, today) >= 0)
    .filter(
      (c) => c.bleeding_flow !== null && BLEEDING_VALUES.includes(c.bleeding_flow as BleedingFlow),
    )
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
}

interface BodyContext {
  episodeCount: number;
  cyclic: boolean;
  onSystemicEstrogen: boolean;
  onProgestogen: boolean;
  hasUterus: boolean | null;
}

/**
 * Holds two things together that are both true: the most likely explanation is usually benign
 * and often progestogen-related, and it still has to be looked at. Leading with the reassurance
 * without the action would be dangerous; leading with cancer would frighten people out of
 * logging honestly. The likely-cause paragraph is only shown when it actually applies.
 */
function buildBody(ctx: BodyContext): string {
  const { episodeCount, cyclic, onSystemicEstrogen, onProgestogen, hasUterus } = ctx;

  // Only an explicit false counts. `null` means we never asked, and guessing "no uterus" from
  // missing data would drop the endometrial framing for someone who needs it.
  const noUterus = hasUterus === false;

  const episodes =
    episodeCount === 1
      ? 'You logged bleeding on one day in the last three months.'
      : `You logged bleeding on ${episodeCount} days in the last three months.`;

  const scheduled = cyclic
    ? '\n\nIf this was your expected scheduled bleed on cyclic progesterone, that is not unusual. ' +
      'If it was unscheduled, or heavier or longer than your usual withdrawal bleed, read on.'
    : '';

  let likelyCause = '';
  if (onSystemicEstrogen && onProgestogen && !noUterus) {
    likelyCause =
      '\n\nA common and very fixable reason for this is the progesterone side of your regimen. ' +
      'If the dose, type, or timing of your progestogen is not quite keeping pace with your estrogen, ' +
      'the lining of the uterus can build up and shed. That is one of the more likely explanations here, ' +
      'and it is usually resolved by adjusting the progestogen — but that adjustment is your provider’s to make, ' +
      'after they have checked what is causing the bleeding.';
  } else if (onSystemicEstrogen && !onProgestogen && hasUterus !== false) {
    likelyCause =
      '\n\nYour records show systemic estrogen without a progestogen alongside it. ' +
      'If you have a uterus, a progestogen is what protects the lining from building up under estrogen, ' +
      'so this is worth raising specifically and promptly. If you are taking a progestogen that is not ' +
      'recorded in TrackHer, adding it here will make this picture more accurate.';
  }

  // How the check is actually done depends on whether there is a uterus to examine. Offering an
  // endometrial biopsy to someone who has had a hysterectomy is both impossible and alarming, and
  // it tells her the app is not reading her own record.
  const howItIsChecked = noUterus
    ? 'The reason for checking quickly rather than waiting is to confirm that. ' +
      'Your record says you do not have a uterus, so this is not about the womb lining — ' +
      'it is usually an examination of the vaginal tissue instead. ' +
      'That is not something symptoms alone can settle.'
    : 'The reason for checking quickly rather than waiting is to confirm that, ' +
      'by looking at the lining of the uterus with a scan or a biopsy. ' +
      'That is not something symptoms alone can settle.';

  return (
    `${episodes} Your profile places you past the menopause transition, when bleeding is not expected.` +
    `${scheduled}` +
    `${likelyCause}\n\n` +
    'Either way, bleeding at this stage — including light spotting — is something clinicians want to look at promptly. ' +
    `Most causes turn out to be benign. ${howItIsChecked}\n\n` +
    'Please contact your provider about this rather than waiting for your next scheduled appointment, ' +
    'and please do not change a dose on your own in the meantime.'
  );
}

/**
 * The questions are the part she is most likely to read out in the appointment, so they have to
 * match her anatomy. Progestogen questions only make sense where there is an endometrium to
 * protect; with no uterus they point the conversation at the wrong organ.
 */
function buildActionSuggestion(ctx: {
  onSystemicEstrogen: boolean;
  hasUterus: boolean | null;
}): string {
  const noUterus = ctx.hasUterus === false;

  const opening =
    'Questions to consider for your provider:\n' +
    '• I have had bleeding since my periods stopped — can I be seen about this?\n';

  if (noUterus) {
    return (
      opening +
      '• I do not have a uterus — what could be causing this bleeding, and how is it checked?\n' +
      '• Are there other causes we should rule out?'
    );
  }

  return (
    opening +
    '• Do I need a transvaginal ultrasound or an endometrial biopsy?\n' +
    (ctx.onSystemicEstrogen
      ? '• Could my progestogen dose, type or timing be causing this?\n' +
        '• Is my current progestogen enough to protect my uterine lining?'
      : '• Are there other causes we should rule out first?')
  );
}

/**
 * Demotes the high-estrogen cluster while a bleeding flag is active.
 *
 * That pattern counts `heavy_bleeding` and `irregular_periods` among its hallmarks, so the same
 * bleeding that triggers the red flag also feeds it — and its questions ask whether the estrogen
 * dose is too high or progesterone should be increased. Inadequate progestogen is a real cause of
 * breakthrough bleeding, so the questions are not wrong; the risk is that sitting beside the red
 * flag they read as "this is a dose problem", which is exactly the wrong conclusion to draw
 * before the bleeding has been looked at. Demoted, not removed.
 */
export function demoteDoseTuningDuringBleedingFlag(insights: Insight[]): Insight[] {
  const flagged = insights.some((i) => i.category === 'bleeding_red_flag');
  if (!flagged) return insights;

  return insights.map((insight) =>
    insight.category === 'symptom_cluster' &&
    insight.supportingData.matchedPattern === 'estrogen_high'
      ? { ...insight, demotedToMore: true }
      : insight,
  );
}

/**
 * Returns at most one insight. Deliberately not confidence-scored or sample-size gated: this is
 * a threshold rule from clinical guidance, not a statistical pattern, and it must not be
 * suppressed by the engine's low-confidence filter.
 */
export function analyzeBleedingRedFlag(input: BleedingRedFlagInput): Insight[] {
  const { profile, checkins, medications, today } = input;
  if (!profile) return [];

  // The stored stage is frozen at onboarding. Someone who signed up during late transition is
  // still recorded as `-1` years after becoming postmenopausal, which would exclude her from
  // this check exactly when it starts to matter. Resolve against elapsed time instead.
  const currentStage = resolveCurrentStrawStage(profile, today);
  if (!isPostmenopausalStage(currentStage)) return [];

  const episodes = bleedingCheckins(checkins, today);
  if (episodes.length === 0) return [];

  const cyclic = hasCyclicProgestogen(medications, today);
  const onSystemicEstrogen = hasSystemicEstrogen(medications, today);
  const onProgestogen = hasAnyProgestogen(medications, today);
  const mostRecent = episodes[0];

  return [
    {
      id: `bleeding-red-flag-${mostRecent.checkin_date}`,
      category: 'bleeding_red_flag',
      priority: 'high',
      title: 'Bleeding after menopause — worth a prompt call to your provider',
      body: buildBody({
        episodeCount: episodes.length,
        cyclic,
        onSystemicEstrogen,
        onProgestogen,
        hasUterus: profile.has_uterus,
      }),
      sampleSize: { n: episodes.length },
      // Fixed high confidence: this is a guideline threshold, not an inferred pattern.
      confidence: {
        score: 1,
        level: 'high',
        basis:
          episodes.length === 1
            ? 'based on 1 day with bleeding logged'
            : `based on ${episodes.length} days with bleeding logged`,
      },
      supportingData: {
        beforePeriod: {
          startDate: episodes[episodes.length - 1].checkin_date,
          endDate: mostRecent.checkin_date,
        },
      },
      relatedSymptoms: ['heavy_bleeding'],
      actionSuggestion: buildActionSuggestion({
        onSystemicEstrogen,
        hasUterus: profile.has_uterus,
      }),
      disclaimer: INSIGHT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    },
  ];
}
