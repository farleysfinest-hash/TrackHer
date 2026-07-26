import { describe, expect, it } from 'vitest';
import {
  computeStagingResult,
  monthsSinceFinalPeriodToStage,
  resolveCurrentStrawStage,
  type StrawStageCode,
  type PeriodsStatus,
} from '../strawStaging';

const TODAY = '2026-07-25';

function profile(overrides: {
  straw_stage?: StrawStageCode | null;
  periods_status?: PeriodsStatus | null;
  last_period_date?: string | null;
}) {
  return {
    straw_stage: overrides.straw_stage ?? null,
    periods_status: overrides.periods_status ?? null,
    last_period_date: overrides.last_period_date ?? null,
  };
}

describe('monthsSinceFinalPeriodToStage', () => {
  it('does not call anyone postmenopausal before 12 months of amenorrhea', () => {
    expect(monthsSinceFinalPeriodToStage(0)).toBe('-1');
    expect(monthsSinceFinalPeriodToStage(11)).toBe('-1');
  });

  it('recognises postmenopause at exactly 12 months', () => {
    expect(monthsSinceFinalPeriodToStage(12)).toBe('+1a');
  });

  it.each<[number, StrawStageCode]>([
    [12, '+1a'],
    [35, '+1a'],
    [36, '+1c'],
    [71, '+1c'],
    [72, '+2'],
    [240, '+2'],
  ])('maps %i months to %s', (months, stage) => {
    expect(monthsSinceFinalPeriodToStage(months)).toBe(stage);
  });
});

describe('resolveCurrentStrawStage', () => {
  it('advances a stage frozen at onboarding once enough time has passed', () => {
    // The bug this exists for: onboarded at ten months of amenorrhea, recorded as late
    // transition, and never updated. Two years on she is genuinely postmenopausal.
    const result = resolveCurrentStrawStage(
      profile({
        straw_stage: '-1',
        periods_status: 'stopped',
        last_period_date: '2024-01-15',
      }),
      TODAY,
    );

    expect(result).toBe('+1a');
  });

  it('leaves the stage alone before 12 months have elapsed', () => {
    const result = resolveCurrentStrawStage(
      profile({
        straw_stage: '-1',
        periods_status: 'stopped',
        last_period_date: '2026-01-15',
      }),
      TODAY,
    );

    expect(result).toBe('-1');
  });

  it('keeps advancing into later stages', () => {
    expect(
      resolveCurrentStrawStage(
        profile({ straw_stage: '-1', periods_status: 'stopped', last_period_date: '2021-01-15' }),
        TODAY,
      ),
    ).toBe('+1c');

    expect(
      resolveCurrentStrawStage(
        profile({ straw_stage: '+1a', periods_status: 'stopped', last_period_date: '2018-01-15' }),
        TODAY,
      ),
    ).toBe('+2');
  });

  it.each<StrawStageCode>(['surgical', 'iatrogenic', 'hysterectomy_ovaries_intact'])(
    'never reinterprets %s, which is an event rather than a point on a timeline',
    (stage) => {
      const result = resolveCurrentStrawStage(
        profile({ straw_stage: stage, periods_status: 'stopped', last_period_date: '2015-01-01' }),
        TODAY,
      );
      expect(result).toBe(stage);
    },
  );

  it.each<PeriodsStatus>(['regular', 'changing'])(
    'does not advance someone still bleeding (%s)',
    (status) => {
      const result = resolveCurrentStrawStage(
        profile({ straw_stage: '-2', periods_status: status, last_period_date: '2020-01-01' }),
        TODAY,
      );
      expect(result).toBe('-2');
    },
  );

  it('falls back to the stored stage when no last period date was recorded', () => {
    const result = resolveCurrentStrawStage(
      profile({ straw_stage: '-1', periods_status: 'stopped', last_period_date: null }),
      TODAY,
    );
    expect(result).toBe('-1');
  });

  it('falls back to the stored stage on an unparseable date rather than guessing', () => {
    const result = resolveCurrentStrawStage(
      profile({ straw_stage: '+1a', periods_status: 'stopped', last_period_date: 'not-a-date' }),
      TODAY,
    );
    expect(result).toBe('+1a');
  });

  it('ignores a future last-period date', () => {
    const result = resolveCurrentStrawStage(
      profile({ straw_stage: '+1a', periods_status: 'stopped', last_period_date: '2027-01-01' }),
      TODAY,
    );
    expect(result).toBe('+1a');
  });

  it('never regresses a stage that is further along than the date implies', () => {
    // A mistyped date must not walk someone backwards out of a stage-gated safety check.
    const result = resolveCurrentStrawStage(
      profile({ straw_stage: '+2', periods_status: 'stopped', last_period_date: '2025-09-01' }),
      TODAY,
    );
    expect(result).toBe('+2');
  });

  it('derives a stage even when none was stored', () => {
    // 2020-01-01 to 2026-07-25 is 78 months — past the six-year boundary.
    const result = resolveCurrentStrawStage(
      profile({ straw_stage: null, periods_status: 'stopped', last_period_date: '2020-01-01' }),
      TODAY,
    );
    expect(result).toBe('+2');
  });
});

describe('computeStagingResult — onboarding answers', () => {
  it('stages regular cycles as late reproductive', () => {
    const result = computeStagingResult({
      periodsStatus: 'regular',
      periodChanges: null,
      lastPeriodTimeframe: null,
      menopauseCauseAnswer: null,
    });
    expect(result?.strawStage).toBe('-3b');
  });

  it.each<[string, StrawStageCode]>([
    ['shorter', '-3a'],
    ['variable', '-2'],
    ['skipping', '-1'],
  ])('stages changing cycles (%s) as %s', (change, stage) => {
    const result = computeStagingResult({
      periodsStatus: 'changing',
      periodChanges: change as 'shorter' | 'variable' | 'skipping',
      lastPeriodTimeframe: null,
      menopauseCauseAnswer: null,
    });
    expect(result?.strawStage).toBe(stage);
  });

  it('returns null when a required follow-up answer is missing', () => {
    expect(
      computeStagingResult({
        periodsStatus: 'changing',
        periodChanges: null,
        lastPeriodTimeframe: null,
        menopauseCauseAnswer: null,
      }),
    ).toBeNull();

    expect(
      computeStagingResult({
        periodsStatus: 'stopped',
        periodChanges: null,
        lastPeriodTimeframe: '1_to_3yr',
        menopauseCauseAnswer: null,
      }),
    ).toBeNull();
  });

  it('flags an unsure cause for follow-up rather than guessing', () => {
    const result = computeStagingResult({
      periodsStatus: 'stopped',
      periodChanges: null,
      lastPeriodTimeframe: '1_to_3yr',
      menopauseCauseAnswer: 'unsure',
    });
    expect(result?.needsFollowUp).toBe(true);
    expect(result?.menopauseCause).toBe('unknown');
  });

  it('routes surgical and treatment-induced menopause to their own stages', () => {
    const surgical = computeStagingResult({
      periodsStatus: 'stopped',
      periodChanges: null,
      lastPeriodTimeframe: '1_to_3yr',
      menopauseCauseAnswer: 'oophorectomy',
    });
    expect(surgical?.strawStage).toBe('surgical');

    const iatrogenic = computeStagingResult({
      periodsStatus: 'stopped',
      periodChanges: null,
      lastPeriodTimeframe: '1_to_3yr',
      menopauseCauseAnswer: 'medical_treatment',
    });
    expect(iatrogenic?.strawStage).toBe('iatrogenic');
  });
});
