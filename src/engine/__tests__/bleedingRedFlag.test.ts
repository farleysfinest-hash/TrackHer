import { describe, expect, it } from 'vitest';
import {
  analyzeBleedingRedFlag,
  demoteDoseTuningDuringBleedingFlag,
  hasCyclicProgestogen,
  isPostmenopausalStage,
} from '../bleedingRedFlag';
import type { Medication, Profile, SymptomCheckin, BleedingFlow } from '../../types/database';
import type { StrawStageCode } from '../../lib/strawStaging';

const TODAY = '2026-07-25';

function makeProfile(stage: StrawStageCode | null): Profile {
  return { id: 'user-1', straw_stage: stage, has_uterus: true } as Profile;
}

function makeCheckin(date: string, bleeding: BleedingFlow | null): SymptomCheckin {
  return { id: `c-${date}`, checkin_date: date, bleeding_flow: bleeding } as SymptomCheckin;
}

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    hormone_category: 'progesterone',
    frequency: 'cyclic',
    is_active: true,
    start_date: '2026-01-01',
    end_date: null,
    ...overrides,
  } as Medication;
}

function analyze(
  stage: StrawStageCode | null,
  checkins: SymptomCheckin[],
  medications: Medication[] = [],
) {
  return analyzeBleedingRedFlag({
    profile: makeProfile(stage),
    checkins,
    medications,
    today: TODAY,
  });
}

describe('isPostmenopausalStage', () => {
  it.each<StrawStageCode>(['+1a', '+1b', '+1c', '+2', 'surgical', 'iatrogenic'])(
    'treats %s as past the transition',
    (stage) => {
      expect(isPostmenopausalStage(stage)).toBe(true);
    },
  );

  it.each<StrawStageCode>(['-3b', '-3a', '-2', '-1'])(
    'does not flag %s, where irregular bleeding is expected',
    (stage) => {
      expect(isPostmenopausalStage(stage)).toBe(false);
    },
  );

  it('does not flag an unknown stage', () => {
    expect(isPostmenopausalStage(null)).toBe(false);
    expect(isPostmenopausalStage(undefined)).toBe(false);
  });

  it('does not flag hysterectomy_ovaries_intact, whose stage is indeterminate', () => {
    // Ovaries still cycling and no uterus — the postmenopausal-bleeding rule does not apply
    // the same way, so this is left out rather than guessed at.
    expect(isPostmenopausalStage('hysterectomy_ovaries_intact')).toBe(false);
  });
});

describe('analyzeBleedingRedFlag — when it fires', () => {
  it('fires on a single day of spotting, not just heavy bleeding', () => {
    const result = analyze('+1b', [makeCheckin('2026-07-20', 'spotting')]);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('bleeding_red_flag');
    expect(result[0].priority).toBe('high');
  });

  it.each<BleedingFlow>(['spotting', 'light', 'moderate', 'heavy'])(
    'fires on %s flow',
    (flow) => {
      expect(analyze('+2', [makeCheckin('2026-07-20', flow)])).toHaveLength(1);
    },
  );

  it('fires after surgical menopause', () => {
    expect(analyze('surgical', [makeCheckin('2026-07-01', 'light')])).toHaveLength(1);
  });

  it('reports high confidence regardless of sample size, so it survives the low-confidence filter', () => {
    const result = analyze('+1a', [makeCheckin('2026-07-24', 'spotting')]);
    expect(result[0].confidence.level).toBe('high');
    expect(result[0].confidence.score).toBe(1);
  });

  it('emits one insight for several bleeding days, not one per day', () => {
    const result = analyze('+1b', [
      makeCheckin('2026-07-20', 'light'),
      makeCheckin('2026-07-21', 'moderate'),
      makeCheckin('2026-07-22', 'heavy'),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].body).toContain('3 days');
  });
});

describe('analyzeBleedingRedFlag — when it must stay silent', () => {
  it.each<StrawStageCode>(['-3b', '-3a', '-2', '-1'])(
    'stays silent during the transition (%s) where bleeding is expected',
    (stage) => {
      expect(analyze(stage, [makeCheckin('2026-07-20', 'heavy')])).toHaveLength(0);
    },
  );

  it('stays silent when no bleeding is logged', () => {
    expect(analyze('+1b', [makeCheckin('2026-07-20', 'none')])).toHaveLength(0);
  });

  it('treats a null bleeding value as unanswered, not as bleeding', () => {
    expect(analyze('+1b', [makeCheckin('2026-07-20', null)])).toHaveLength(0);
  });

  it('stays silent without a profile', () => {
    const result = analyzeBleedingRedFlag({
      profile: null,
      checkins: [makeCheckin('2026-07-20', 'heavy')],
      medications: [],
      today: TODAY,
    });
    expect(result).toHaveLength(0);
  });

  it('ignores bleeding older than the lookback window', () => {
    // 100 days before 2026-07-25.
    expect(analyze('+1b', [makeCheckin('2026-04-16', 'heavy')])).toHaveLength(0);
  });

  it('ignores check-ins dated in the future', () => {
    expect(analyze('+1b', [makeCheckin('2026-08-01', 'heavy')])).toHaveLength(0);
  });

  it('includes bleeding exactly at the lookback boundary', () => {
    expect(analyze('+1b', [makeCheckin('2026-04-26', 'spotting')])).toHaveLength(1);
  });
});

describe('hasCyclicProgestogen', () => {
  it('detects an active cyclic progesterone', () => {
    expect(hasCyclicProgestogen([makeMedication()], TODAY)).toBe(true);
  });

  it('detects a cyclic combination product', () => {
    expect(
      hasCyclicProgestogen([makeMedication({ hormone_category: 'combination' })], TODAY),
    ).toBe(true);
  });

  it('does not count continuous progesterone', () => {
    expect(hasCyclicProgestogen([makeMedication({ frequency: 'daily' })], TODAY)).toBe(false);
  });

  it('does not count cyclic estrogen', () => {
    expect(
      hasCyclicProgestogen([makeMedication({ hormone_category: 'estrogen' })], TODAY),
    ).toBe(false);
  });

  it('does not count a discontinued medication', () => {
    expect(hasCyclicProgestogen([makeMedication({ is_active: false })], TODAY)).toBe(false);
  });

  it('does not count a course that already ended', () => {
    expect(hasCyclicProgestogen([makeMedication({ end_date: '2026-06-01' })], TODAY)).toBe(false);
  });
});

describe('analyzeBleedingRedFlag — copy', () => {
  it('still fires on cyclic progestogen but distinguishes a scheduled bleed', () => {
    const result = analyze('+1b', [makeCheckin('2026-07-20', 'moderate')], [makeMedication()]);

    expect(result).toHaveLength(1);
    expect(result[0].body).toContain('scheduled bleed');
    expect(result[0].body).toContain('unscheduled');
  });

  it('omits the scheduled-bleed caveat on continuous therapy', () => {
    const result = analyze(
      '+1b',
      [makeCheckin('2026-07-20', 'moderate')],
      [makeMedication({ frequency: 'daily' })],
    );

    expect(result[0].body).not.toContain('scheduled bleed');
  });

  it('directs the user to contact their provider rather than adjust a dose', () => {
    const result = analyze('+1b', [makeCheckin('2026-07-20', 'light')]);

    // Assert the property, not the exact sentence, so copy edits do not silently drop it.
    expect(result[0].body).toMatch(/contact your provider/i);
    expect(result[0].body).toMatch(/do not change a dose/i);
  });

  it('names the actual investigations so the user can ask for them', () => {
    const result = analyze('+1b', [makeCheckin('2026-07-20', 'light')]);

    expect(result[0].actionSuggestion).toContain('ultrasound');
    expect(result[0].actionSuggestion).toContain('biopsy');
  });

  it('does not name cancer, but does explain why the check is prompt', () => {
    const result = analyze('+1b', [makeCheckin('2026-07-20', 'light')]);

    // Calm framing: explain the reason without leading with a frightening diagnosis.
    expect(result[0].body).not.toMatch(/cancer|carcinoma|malignan/i);
    expect(result[0].body).toMatch(/lining of the uterus/i);
    expect(result[0].body).toMatch(/benign|not serious/i);
  });

  it('is not filed under the mental-health category withheld from provider reports', () => {
    const result = analyze('+1b', [makeCheckin('2026-07-20', 'light')]);
    expect(result[0].category).not.toBe('safeguarding');
  });
});

describe('demoteDoseTuningDuringBleedingFlag', () => {
  const estrogenHigh = {
    id: 'cluster-estrogen_high',
    category: 'symptom_cluster',
    supportingData: { matchedPattern: 'estrogen_high' },
  } as unknown as import('../types').Insight;

  const estrogenLow = {
    id: 'cluster-estrogen_low',
    category: 'symptom_cluster',
    supportingData: { matchedPattern: 'estrogen_low' },
  } as unknown as import('../types').Insight;

  const flag = {
    id: 'bleeding-red-flag-2026-07-20',
    category: 'bleeding_red_flag',
    supportingData: {},
  } as unknown as import('../types').Insight;

  it('leaves insights alone when no bleeding flag is present', () => {
    const result = demoteDoseTuningDuringBleedingFlag([estrogenHigh, estrogenLow]);
    expect(result.every((i) => !i.demotedToMore)).toBe(true);
  });

  it('demotes the high-estrogen cluster when a bleeding flag is present', () => {
    const result = demoteDoseTuningDuringBleedingFlag([flag, estrogenHigh, estrogenLow]);
    expect(result.find((i) => i.id === 'cluster-estrogen_high')!.demotedToMore).toBe(true);
  });

  it('does not demote unrelated clusters', () => {
    const result = demoteDoseTuningDuringBleedingFlag([flag, estrogenHigh, estrogenLow]);
    expect(result.find((i) => i.id === 'cluster-estrogen_low')!.demotedToMore).toBeUndefined();
  });

  it('never demotes the bleeding flag itself', () => {
    const result = demoteDoseTuningDuringBleedingFlag([flag, estrogenHigh]);
    expect(result.find((i) => i.category === 'bleeding_red_flag')!.demotedToMore).toBeUndefined();
  });
});

describe('analyzeBleedingRedFlag — progesterone explanation', () => {
  const patch = makeMedication({
    id: 'e1',
    hormone_category: 'estrogen',
    delivery_method: 'patch',
    frequency: 'weekly',
  });
  const vaginalOnly = makeMedication({
    id: 'e2',
    hormone_category: 'estrogen',
    delivery_method: 'vaginal_cream',
    frequency: 'daily',
  });
  const progesterone = makeMedication({
    id: 'p1',
    hormone_category: 'progesterone',
    delivery_method: 'oral_capsule',
    frequency: 'daily',
  });
  const bleed = [makeCheckin('2026-07-20', 'light')];

  it('offers the progestogen explanation on systemic estrogen plus progestogen', () => {
    const body = analyze('+1b', bleed, [patch, progesterone])[0].body;

    expect(body).toMatch(/progesterone side of your regimen/i);
    expect(body).toMatch(/fixable/i);
    // Reassurance must never become permission to self-adjust.
    expect(body).toMatch(/provider’s to make/i);
  });

  it('raises unopposed systemic estrogen specifically', () => {
    const body = analyze('+1b', bleed, [patch])[0].body;

    expect(body).toMatch(/without a progestogen/i);
    expect(body).toMatch(/protects the lining/i);
    // Invites correcting the record rather than assuming the data is complete.
    expect(body).toMatch(/not recorded in TrackHer/i);
  });

  it('does not mention progesterone at all when she is on no hormone therapy', () => {
    const body = analyze('+1b', bleed, [])[0].body;

    expect(body).not.toMatch(/progest/i);
  });

  it('treats local vaginal estrogen as not requiring progestogen opposition', () => {
    const body = analyze('+1b', bleed, [vaginalOnly])[0].body;

    expect(body).not.toMatch(/without a progestogen/i);
  });

  it('keeps the prompt-evaluation instruction in every variant', () => {
    for (const meds of [[], [patch], [patch, progesterone], [vaginalOnly]]) {
      const body = analyze('+1b', bleed, meds)[0].body;
      expect(body).toMatch(/contact your provider/i);
      expect(body).toMatch(/do not change a dose/i);
      expect(body).not.toMatch(/cancer|carcinoma|malignan/i);
    }
  });

  it('adds progestogen questions only when she is on systemic estrogen', () => {
    expect(analyze('+1b', bleed, [patch])[0].actionSuggestion).toMatch(/progestogen/i);
    expect(analyze('+1b', bleed, [])[0].actionSuggestion).not.toMatch(/progestogen/i);
  });
});
