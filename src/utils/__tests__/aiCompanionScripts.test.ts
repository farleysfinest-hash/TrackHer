import { describe, expect, it } from 'vitest';
import {
  buildCompanionScriptReply,
  classifyCompanionShape,
  classifyCrisisTier,
  priorCrisisReplyCount,
  routeMentalDeclineChat,
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
  it('splits mental decline vs ideation vs imminent', () => {
    expect(classifyCrisisTier("its making me feel depressed i cant fix this")).toBe(
      'mental_decline',
    );
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

  it('mental decline cites mood and does not dump full crisis script', () => {
    const out = buildCompanionScriptReply("its making me feel depressed i cant fix this", facts);
    expect(out?.shape).toBe('mental_decline');
    expect(out?.reply).toMatch(/mood ~3\.8/);
    expect(out?.reply).toMatch(/progesterone|Prometrium/i);
    expect(out?.reply).not.toMatch(/I can't be your crisis counselor/);
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

describe('treatment-context exception for mental_decline', () => {
  it('HRT/menopause language suppresses mental_decline', () => {
    // Each case uses a keyword that WOULD match mental_decline without the exception.
    expect(classifyCrisisTier('HRT is making me feel hopeless')).toBeNull();
    expect(classifyCrisisTier('i feel hopeless about menopause')).toBeNull();
    expect(classifyCrisisTier('estradiol is making me numb and empty')).toBeNull();
    expect(classifyCrisisTier('perimenopause has me overwhelmed')).toBeNull();
    expect(classifyCrisisTier('progesterone makes me feel so low and awful')).toBeNull();
    expect(classifyCrisisTier('these hormones are making everything worse mentally')).toBeNull();
    expect(classifyCrisisTier('night sweats have me feeling hopeless')).toBeNull();
    expect(classifyCrisisTier('hot flashes and i cant do this anymore')).toBeNull();
    expect(classifyCrisisTier('this HRT is making me feel so depressed')).toBeNull();
  });

  it('matches depress stem forms (depressed / depressing)', () => {
    expect(classifyCrisisTier('i feel so depressed')).toBe('mental_decline');
    expect(classifyCrisisTier('i have been feeling depressed lately')).toBe('mental_decline');
    expect(classifyCrisisTier('everything feels depressing')).toBe('mental_decline');
  });

  it('bare emotional language without treatment context still triggers', () => {
    expect(classifyCrisisTier('i feel hopeless')).toBe('mental_decline');
    expect(classifyCrisisTier('everything is empty and numb')).toBe('mental_decline');
    expect(classifyCrisisTier('i cant do this anymore')).toBe('mental_decline');
    expect(classifyCrisisTier('im overwhelm by everything')).toBe('mental_decline');
    expect(classifyCrisisTier('broken inside and cant go on')).toBe('mental_decline');
  });

  it('generic medical words do NOT suppress mental_decline', () => {
    expect(classifyCrisisTier('i feel hopeless my doctor doesnt care')).toBe('mental_decline');
    expect(classifyCrisisTier('i feel empty after therapy')).toBe('mental_decline');
    expect(classifyCrisisTier('feeling numb from all the pills')).toBe('mental_decline');
    expect(classifyCrisisTier('this medication has me feeling hopeless')).toBe('mental_decline');
    expect(classifyCrisisTier('cant do this treatment anymore')).toBe('mental_decline');
  });

  it('genuine SI is never suppressed by treatment context', () => {
    expect(classifyCrisisTier('i want to kill myself because of this HRT')).toBe('crisis');
    expect(classifyCrisisTier('menopause makes me want to die')).toBe('crisis');
    expect(classifyCrisisTier('im going to end it, estradiol isnt helping')).toBe('crisis');
  });

  it('mental_decline reply does not preemptively mention 988 or suicide', () => {
    const out = buildCompanionScriptReply('i feel hopeless and empty', facts);
    expect(out?.shape).toBe('mental_decline');
    expect(out?.reply).not.toMatch(/988/);
    expect(out?.reply).not.toMatch(/wanting to die/);
    expect(out?.reply).toMatch(/clinician/);
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

describe('routeMentalDeclineChat', () => {
  it('sends treatment complaints to free-chat risk_watch', () => {
    expect(routeMentalDeclineChat('HRT is making me feel hopeless')).toBe(
      'free_chat_risk_watch',
    );
    expect(routeMentalDeclineChat('this HRT is making me feel so depressed')).toBe(
      'free_chat_risk_watch',
    );
    expect(routeMentalDeclineChat('estradiol leaves me numb and empty')).toBe(
      'free_chat_risk_watch',
    );
  });

  it('keeps bare low mood on the one-shot script path', () => {
    expect(routeMentalDeclineChat('i feel hopeless')).toBe('one_shot_script');
    expect(routeMentalDeclineChat('i feel so depressed')).toBe('one_shot_script');
    expect(routeMentalDeclineChat('i feel hopeless my doctor doesnt care')).toBe(
      'one_shot_script',
    );
  });
});
