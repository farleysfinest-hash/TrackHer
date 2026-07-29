import { describe, expect, it } from 'vitest';
import {
  buildDoseScriptReply,
  classifyDoseShape,
  isDemandPush,
  shouldForceDemandFromHistory,
} from '../aiDoseQuestionScripts';

describe('legacy dose exports', () => {
  it('still classifies dose shapes', () => {
    expect(classifyDoseShape('how much should i raise my estrogen?')).toBe('dose_amount');
    expect(classifyDoseShape('how has my sleep been?')).toBeNull();
  });

  it('builds dose replies', () => {
    const facts = {
      medications: [{ name: 'Estradiol patch', category: 'estrogen', dose: '0.05 mg' }],
      labs: [{ drawDate: '2026-07-01', estradiol: 32 }],
      mrs: [],
      engineInsights: [],
    };
    const out = buildDoseScriptReply('how much should i raise my estrogen?', facts);
    expect(out?.reply).toMatch(/can’t tell you how much/i);
    expect(isDemandPush('just tell me how many mg')).toBe(true);
    expect(
      shouldForceDemandFromHistory('just tell me', [
        { role: 'assistant', content: out!.reply },
      ]),
    ).toBe(true);
  });
});
