export type StrawStageCode =
  | '-3b'
  | '-3a'
  | '-2'
  | '-1'
  | '+1a'
  | '+1b'
  | '+1c'
  | '+2'
  | 'surgical'
  | 'iatrogenic'
  | 'hysterectomy_ovaries_intact';

export type PeriodsStatus = 'regular' | 'changing' | 'stopped';
export type PeriodChanges = 'shorter' | 'variable' | 'skipping';
export type LastPeriodTimeframe =
  | 'less_than_12mo'
  | '1_to_3yr'
  | '3_to_6yr'
  | 'more_than_6yr';
export type MenopauseCause =
  | 'natural'
  | 'surgical'
  | 'chemotherapy'
  | 'radiation'
  | 'hysterectomy'
  | 'unknown';

export type StagingSubStep = 'q1' | 'q2' | 'q3' | 'q4' | 'result';
export type MenopauseCauseAnswer =
  | 'oophorectomy'
  | 'medical_treatment'
  | 'hysterectomy'
  | 'natural'
  | 'unsure';

export interface StagingAnswers {
  periodsStatus: PeriodsStatus | null;
  periodChanges: PeriodChanges | null;
  lastPeriodTimeframe: LastPeriodTimeframe | null;
  menopauseCauseAnswer: MenopauseCauseAnswer | null;
}

export interface StagingResult {
  strawStage: StrawStageCode;
  strawStageLabel: string;
  description: string;
  menopauseCause: MenopauseCause;
  needsFollowUp: boolean;
}

export interface StrawTimelineStage {
  code: StrawStageCode;
  shortLabel: string;
  label: string;
}

export const STRAW_TIMELINE_STAGES: StrawTimelineStage[] = [
  { code: '-3b', shortLabel: '-3b', label: 'Late Reproductive' },
  { code: '-3a', shortLabel: '-3a', label: 'Late Reproductive' },
  { code: '-2', shortLabel: '-2', label: 'Early Transition' },
  { code: '-1', shortLabel: '-1', label: 'Late Transition' },
  { code: '+1a', shortLabel: '+1a', label: 'Early Post' },
  { code: '+1b', shortLabel: '+1b', label: 'Early Post' },
  { code: '+1c', shortLabel: '+1c', label: 'Early Post' },
  { code: '+2', shortLabel: '+2', label: 'Late Post' },
];

export const SPECIAL_STAGES: StrawTimelineStage[] = [
  { code: 'surgical', shortLabel: 'Surg', label: 'Surgical Menopause' },
  { code: 'iatrogenic', shortLabel: 'Iatr', label: 'Iatrogenic Menopause' },
  {
    code: 'hysterectomy_ovaries_intact',
    shortLabel: 'Hyst',
    label: 'Hysterectomy (ovaries intact)',
  },
];

const STAGE_DETAILS: Record<
  StrawStageCode,
  { label: string; description: string }
> = {
  '-3b': {
    label: 'Late Reproductive',
    description:
      'You still have regular periods. Hormone levels may be shifting, but your cycles remain predictable for now.',
  },
  '-3a': {
    label: 'Late Reproductive',
    description:
      'Your cycles are changing — shorter or less predictable — which often signals the start of the menopause transition.',
  },
  '-2': {
    label: 'Early Menopausal Transition',
    description:
      'Your cycle length varies noticeably. This is a common early sign of perimenopause as hormone levels fluctuate.',
  },
  '-1': {
    label: 'Late Menopausal Transition',
    description:
      'You are going longer between periods — often 60+ days — as your body moves toward the final menstrual period.',
  },
  '+1a': {
    label: 'Early Postmenopause',
    description:
      'It has been about 1–3 years since your last period. Symptoms may still be active as your body adjusts.',
  },
  '+1b': {
    label: 'Early Postmenopause',
    description:
      'You are in early postmenopause. Hormone levels are stabilizing at a new baseline.',
  },
  '+1c': {
    label: 'Early Postmenopause (stabilizing)',
    description:
      'You are 3–6 years past your last period. Many symptoms begin to ease as hormones settle.',
  },
  '+2': {
    label: 'Late Postmenopause',
    description:
      'It has been more than 6 years since your last period. You are in late postmenopause with stable low hormone levels.',
  },
  surgical: {
    label: 'Surgical Menopause',
    description:
      'Your menopause was caused by surgical removal of the ovaries. Symptoms can be sudden and intense.',
  },
  iatrogenic: {
    label: 'Iatrogenic Menopause',
    description:
      'Your menopause was brought on by chemotherapy, radiation, or other medical treatment.',
  },
  hysterectomy_ovaries_intact: {
    label: 'Hysterectomy (ovaries intact)',
    description:
      'Your uterus was removed but your ovaries remain. You may still have ovarian function, though menstrual tracking is not possible.',
  },
};

/** Plain-language dashboard copy per STRAW+10 stage — factual, normalizing, no individual predictions. */
export const STAGE_DASHBOARD_DESCRIPTIONS: Record<StrawStageCode, string> = {
  '-3b':
    'You are in late reproductive life with regular cycles. Subtle cycle changes are common at this stage, and many women notice shifts in sleep, mood, or energy before anything is officially considered perimenopause.',
  '-3a':
    'You are in late reproductive life with cycles that are starting to change. Shorter or less predictable periods are common here, and hormone levels may begin shifting even before cycles look obviously irregular.',
  '-2':
    'You are in early perimenopause — the menopausal transition. Cycles are becoming irregular, and fluctuating hormones (not just low ones) drive many symptoms at this stage, including hot flashes, sleep changes, and mood shifts.',
  '-1':
    'You are in late perimenopause. Longer gaps between periods are typical now, and vasomotor symptoms such as hot flashes and night sweats commonly peak in this window as your body moves toward the final menstrual period.',
  '+1a':
    'You are in early postmenopause — the first years after your final period. Symptoms often remain active as your body adjusts to a new hormonal baseline, even though menstruation has stopped.',
  '+1b':
    'You are in early postmenopause. Your hormone levels are settling at a lower baseline, but many women still experience active symptoms during these first postmenopausal years.',
  '+1c':
    'You are in early postmenopause and several years past your last period. Symptoms may begin to ease as hormones stabilize, though individual experience varies widely.',
  '+2':
    'You are in late postmenopause. Hormone levels have largely stabilized at a lower baseline; genitourinary symptoms such as vaginal dryness and bladder changes tend to persist more than vasomotor ones for many women.',
  surgical:
    'Your menopause was caused by surgical removal of the ovaries. Symptoms can begin suddenly and intensely because hormone production drops abruptly rather than gradually over years.',
  iatrogenic:
    'Your menopause was brought on by medical treatment such as chemotherapy or radiation. Hormone changes can be abrupt, and symptoms may overlap with effects of the underlying treatment.',
  hysterectomy_ovaries_intact:
    'Your uterus was removed but your ovaries remain. You may still have ovarian hormone production and perimenopausal changes, though tracking periods is no longer possible.',
};

export function getStageDashboardDescription(
  code: StrawStageCode | null | undefined,
): string | null {
  if (!code) return null;
  return STAGE_DASHBOARD_DESCRIPTIONS[code] ?? null;
}

function timeframeToStage(timeframe: LastPeriodTimeframe): StrawStageCode {
  switch (timeframe) {
    case 'less_than_12mo':
      return '-1';
    case '1_to_3yr':
      return '+1a';
    case '3_to_6yr':
      return '+1c';
    case 'more_than_6yr':
      return '+2';
  }
}

function causeAnswerToCause(answer: MenopauseCauseAnswer): MenopauseCause {
  switch (answer) {
    case 'oophorectomy':
      return 'surgical';
    case 'medical_treatment':
      return 'chemotherapy';
    case 'hysterectomy':
      return 'hysterectomy';
    case 'natural':
      return 'natural';
    case 'unsure':
      return 'unknown';
  }
}

export function computeStagingResult(answers: StagingAnswers): StagingResult | null {
  const { periodsStatus, periodChanges, lastPeriodTimeframe, menopauseCauseAnswer } = answers;

  if (!periodsStatus) return null;

  if (periodsStatus === 'regular') {
    return {
      strawStage: '-3b',
      strawStageLabel: STAGE_DETAILS['-3b'].label,
      description: STAGE_DETAILS['-3b'].description,
      menopauseCause: 'natural',
      needsFollowUp: false,
    };
  }

  if (periodsStatus === 'changing') {
    if (!periodChanges) return null;
    const stageMap: Record<PeriodChanges, StrawStageCode> = {
      shorter: '-3a',
      variable: '-2',
      skipping: '-1',
    };
    const stage = stageMap[periodChanges];
    return {
      strawStage: stage,
      strawStageLabel: STAGE_DETAILS[stage].label,
      description: STAGE_DETAILS[stage].description,
      menopauseCause: 'natural',
      needsFollowUp: false,
    };
  }

  // stopped — need Q3 and Q4
  if (!lastPeriodTimeframe || !menopauseCauseAnswer) return null;

  const needsFollowUp = menopauseCauseAnswer === 'unsure';
  const menopauseCause = causeAnswerToCause(menopauseCauseAnswer);

  if (menopauseCauseAnswer === 'oophorectomy') {
    return {
      strawStage: 'surgical',
      strawStageLabel: STAGE_DETAILS.surgical.label,
      description: STAGE_DETAILS.surgical.description,
      menopauseCause,
      needsFollowUp,
    };
  }

  if (menopauseCauseAnswer === 'medical_treatment') {
    return {
      strawStage: 'iatrogenic',
      strawStageLabel: STAGE_DETAILS.iatrogenic.label,
      description: STAGE_DETAILS.iatrogenic.description,
      menopauseCause,
      needsFollowUp,
    };
  }

  if (menopauseCauseAnswer === 'hysterectomy') {
    return {
      strawStage: 'hysterectomy_ovaries_intact',
      strawStageLabel: STAGE_DETAILS.hysterectomy_ovaries_intact.label,
      description: STAGE_DETAILS.hysterectomy_ovaries_intact.description,
      menopauseCause,
      needsFollowUp,
    };
  }

  const timeStage = timeframeToStage(lastPeriodTimeframe);
  return {
    strawStage: timeStage,
    strawStageLabel: STAGE_DETAILS[timeStage].label,
    description: STAGE_DETAILS[timeStage].description,
    menopauseCause,
    needsFollowUp,
  };
}

export function getNextStagingSubStep(
  current: StagingSubStep,
  answers: StagingAnswers,
): StagingSubStep | null {
  switch (current) {
    case 'q1':
      if (answers.periodsStatus === 'changing') return 'q2';
      if (answers.periodsStatus === 'stopped') return 'q3';
      if (answers.periodsStatus === 'regular') return 'result';
      return null;
    case 'q2':
      return answers.periodChanges ? 'result' : null;
    case 'q3':
      return answers.lastPeriodTimeframe ? 'q4' : null;
    case 'q4':
      return answers.menopauseCauseAnswer ? 'result' : null;
    case 'result':
      return null;
  }
}

export function getPrevStagingSubStep(
  current: StagingSubStep,
  answers: StagingAnswers,
): StagingSubStep | null {
  switch (current) {
    case 'q1':
      return null;
    case 'q2':
      return 'q1';
    case 'q3':
      return 'q1';
    case 'q4':
      return 'q3';
    case 'result':
      if (answers.periodsStatus === 'stopped') return 'q4';
      if (answers.periodsStatus === 'changing') return 'q2';
      return 'q1';
  }
}

export function isTimelineStage(code: StrawStageCode): boolean {
  return STRAW_TIMELINE_STAGES.some((s) => s.code === code);
}

export function getTimelineHighlightIndex(code: StrawStageCode): number {
  const idx = STRAW_TIMELINE_STAGES.findIndex((s) => s.code === code);
  if (idx >= 0) return idx;
  // Map special stages to approximate timeline position
  if (code === 'surgical' || code === 'iatrogenic') return 3; // near -1/+1a
  if (code === 'hysterectomy_ovaries_intact') return 2;
  return 0;
}
