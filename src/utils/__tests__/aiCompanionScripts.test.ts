import { describe, expect, it } from 'vitest';
import {
  buildCompanionScriptReply,
  classifyCompanionShape,
  classifyCrisisTier,
  priorCrisisReplyCount,
} from '../aiCompanionScripts';

const facts = {
  profile: { strawStage: '+1b', menopauseStage: 'postmenopause' as string | null },
  medications: [
    { name: 'Estradiol patch', category: 'estrogen', dose: '0.05 mg' },
    { name: 'Prometrium', category: 'progesterone', dose: '200 mg' },
  ],
  labs: [{ drawDate: '2026-07-01', estradiol: 32, testosterone: null, fsh: 55, progesterone: null }],
  mrs: [
    { date: '2026-06-01', total: 18 },
    { date: '2026-07-01', total: 24 },
  ],
  pulseRecent: { daysSampled: 14, avgEnergy: 3.0, avgMood: 3.8, avgSleep: 4.0 },
  recentDoseChanges: [
    {
      date: '2026-06-10',
      medicationName: 'Prometrium',
      changeType: 'dose_increased',
      notes: '100 to 200',
    },
  ],
  engineInsights: [],
};

describe('threat levels', () => {
  it('splits ordinary low mood vs ideation vs imminent', () => {
    expect(classifyCrisisTier("its making me feel depressed i cant fix this")).toBeNull();
    expect(classifyCrisisTier('i feel tired')).toBeNull();
    expect(classifyCrisisTier('im going to kill myself')).toBe('crisis');
    expect(classifyCrisisTier('im going to kill myself with a gun')).toBe('crisis_imminent');
    expect(classifyCrisisTier('im going to do it tonight')).toBe('crisis_imminent');
  });

  it('does not repeat the same crisis paragraph on follow-up', () => {
    const first = buildCompanionScriptReply('im going to kill myself', facts, { history: [] });
    const second = buildCompanionScriptReply('you said the same thing, im going to kill myself with a gun', facts, {
      history: [{ role: 'assistant', content: first!.reply }],
    });
    expect(first?.reply).not.toEqual(second?.reply);
    expect(second?.shape).toBe('crisis_imminent');
    expect(second?.reply).toMatch(/not going to paste the same|I'm still here|firearm|urgent/i);
    expect(priorCrisisReplyCount([{ role: 'assistant', content: first!.reply }])).toBe(1);
  });

  it('low mood without SI is ordinary chat (no scripted reply)', () => {
    expect(buildCompanionScriptReply("its making me feel depressed i cant fix this", facts)).toBeNull();
    expect(buildCompanionScriptReply('i feel tired', facts)).toBeNull();
  });

  it('answers why progesterone hurt energy', () => {
    expect(classifyCompanionShape('why did progesterone lower my energy it was supposed to help?')).toBe(
      'med_effect',
    );
    const out = buildCompanionScriptReply(
      'why did progesterone lower my energy it was supposed to help?',
      facts,
    );
    expect(out?.reply).toMatch(/supposed to help|fair question/i);
    expect(out?.reply).toMatch(/dose_increased|June 10|2026-06-10|progesterone/i);
    expect(out?.reply).toMatch(/won.t tell you to stop/i);
  });
});

describe('low mood without SI never opens crisis', () => {
  it('HRT/menopause + low mood is ordinary (null tier)', () => {
    expect(classifyCrisisTier('HRT is making me feel hopeless')).toBeNull();
    expect(classifyCrisisTier('i feel hopeless about menopause')).toBeNull();
    expect(classifyCrisisTier('estradiol is making me numb and empty')).toBeNull();
    expect(classifyCrisisTier('perimenopause has me overwhelmed')).toBeNull();
    expect(classifyCrisisTier('this HRT is making me feel so depressed')).toBeNull();
  });

  it('bare emotional language without SI is ordinary', () => {
    expect(classifyCrisisTier('i feel so depressed')).toBeNull();
    expect(classifyCrisisTier('i feel hopeless')).toBeNull();
    expect(classifyCrisisTier('everything is empty and numb')).toBeNull();
    expect(classifyCrisisTier('i cant do this anymore')).toBeNull();
    expect(classifyCrisisTier('i feel tired')).toBeNull();
  });

  it('genuine SI is never suppressed by treatment context', () => {
    expect(classifyCrisisTier('i want to kill myself because of this HRT')).toBe('crisis');
    expect(classifyCrisisTier('menopause makes me want to die')).toBe('crisis');
    expect(classifyCrisisTier('im going to end it, estradiol isnt helping')).toBe('crisis');
  });
});

describe('clear SI euphemisms', () => {
  it.each([
    'i want to off myself',
    'im going to off myself',
    'thinking about offing myself',
    'i might take myself out',
    'i could do myself in',
  ])('classifies clear euphemism as crisis: %s', (message) => {
    expect(classifyCrisisTier(message)).toBe('crisis');
  });
});

describe('passive SI: wish I was dead', () => {
  it.each([
    'i wish i was dead',
    'i wish i were dead',
    'i wish i was dead sometimes',
    'sometimes i wished i were dead',
  ])('classifies passive SI as crisis: %s', (message) => {
    expect(classifyCrisisTier(message)).toBe('crisis');
  });
});

describe('recovery with re-assertion', () => {
  it('pure recovery suppresses crisis', () => {
    expect(classifyCrisisTier('i used to want to die but im doing better now')).toBeNull();
  });

  it('re-assertion overrides recovery', () => {
    expect(classifyCrisisTier('i used to want to die, im better now, but i want to die again')).toBe('crisis');
    expect(classifyCrisisTier('i wanted to kill myself last month, im okay now, but i still want to die')).toBe('crisis');
  });
});

describe('low mood without SI', () => {
  it('low mood is not classified as a crisis tier', () => {
    expect(classifyCrisisTier('i feel hopeless')).toBeNull();
    expect(classifyCrisisTier('i feel so depressed')).toBeNull();
    expect(classifyCrisisTier('HRT is making me feel hopeless')).toBeNull();
    expect(classifyCrisisTier('estradiol leaves me numb and empty')).toBeNull();
  });
});
