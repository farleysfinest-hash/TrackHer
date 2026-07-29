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
    expect(second?.reply).toMatch(/not going to paste the same|I’m still here|firearm|urgent/i);
    expect(priorCrisisReplyCount([{ role: 'assistant', content: first!.reply }])).toBe(1);
  });

  it('mental decline cites mood and does not dump full crisis script', () => {
    const out = buildCompanionScriptReply("its making me feel depressed i cant fix this", facts);
    expect(out?.shape).toBe('mental_decline');
    expect(out?.reply).toMatch(/mood ~3\.8/);
    expect(out?.reply).toMatch(/progesterone|Prometrium/i);
    expect(out?.reply).not.toMatch(/I can’t be your crisis counselor/);
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
    expect(out?.reply).toMatch(/won’t tell you to stop/i);
  });
});
