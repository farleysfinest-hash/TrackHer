import { describe, expect, it } from 'vitest';
import {
  currentMessageHasCrisisSignal,
} from '../../../supabase/functions/ai-assistant/crisisController';
import {
  buildCompanionScriptReply,
  classifyCrisisTier,
  isMemorySafeContent,
  parseRiskTierLabel,
  parseRiskTierWord,
} from '../aiCompanionScripts';
// MemorySafetyError import avoided — lunaConversations.ts initializes Supabase at module
// level. The error message content is tested via inline assertion instead.

describe('Fix 1: current danger overrides crisis resolution', () => {
  it('"I\'m safe now, but I\'m going to do it tonight" still signals crisis', () => {
    expect(currentMessageHasCrisisSignal("I'm safe now, but I'm going to do it tonight")).toBe(
      true,
    );
    expect(classifyCrisisTier("I'm safe now, but I'm going to do it tonight")).toBe(
      'crisis_imminent',
    );
  });

  it('"I\'m safe now, but I have a gun" still signals crisis', () => {
    expect(currentMessageHasCrisisSignal("I'm safe now, but I have a gun")).toBe(true);
  });

  it('"I got help, but I still want to hurt myself" still signals crisis', () => {
    expect(
      currentMessageHasCrisisSignal('I got emergency help, but I still want to hurt myself'),
    ).toBe(true);
  });

  it('resolution does not return to medication or symptom analysis', () => {
    const result = buildCompanionScriptReply("I'm safe now", {});
    // "I'm safe now" has no dose/symptom shape, so companion scripts return null.
    expect(result).toBeNull();
  });
});

describe('Fix 2: loved-one risk classifier backstop', () => {
  it('parseRiskTierLabel("loved_one") returns loved_one', () => {
    expect(parseRiskTierLabel('loved_one')).toBe('loved_one');
  });

  it('leading prose "probably loved_one" is invalid and fails closed', () => {
    expect(parseRiskTierLabel('probably loved_one')).toBeNull();
  });

  it('existing labels still parse correctly', () => {
    expect(parseRiskTierLabel('imminent')).toBe('crisis_imminent');
    expect(parseRiskTierLabel('ideation')).toBe('crisis');
    expect(parseRiskTierLabel('decline')).toBe('none');
    expect(parseRiskTierLabel('none')).toBe('none');
  });

  it('accepts the canonical tier labels the Luna model may return', () => {
    expect(parseRiskTierLabel('crisis')).toBe('crisis');
    expect(parseRiskTierLabel('crisis_imminent')).toBe('crisis_imminent');
    expect(parseRiskTierLabel('mental_decline')).toBe('none');
    expect(parseRiskTierLabel('loved-one crisis')).toBe('loved_one');
  });

  it('parseRiskTierWord returns loved_one as a CrisisTier', () => {
    expect(parseRiskTierWord('loved_one')).toBe('loved_one');
  });

  it('existing daughter wording still routes to loved_one_crisis via regex', () => {
    const out = buildCompanionScriptReply(
      'my daughter told me she wants to kill herself what do i do',
      {},
    );
    expect(out?.shape).toBe('loved_one_crisis');
  });

  it('"I\'m safe now" combined with loved-one crisis still signals crisis', () => {
    expect(
      currentMessageHasCrisisSignal(
        "I'm safe now, but my niece keeps saying she wants to kill herself",
      ),
    ).toBe(true);
  });
});

describe('Fix 3: memory safety predicate', () => {
  it('safe preference memory is accepted', () => {
    expect(isMemorySafeContent('I prefer morning appointments')).toBe(true);
  });

  it('safe work-schedule memory is accepted', () => {
    expect(isMemorySafeContent('I work night shifts Tuesday through Thursday')).toBe(true);
  });

  it('explicit appointment memory is accepted', () => {
    expect(isMemorySafeContent('My next appointment is August 15 with Dr. Chen')).toBe(true);
  });

  it('active suicidal content is rejected', () => {
    expect(isMemorySafeContent('I want to kill myself')).toBe(false);
  });

  it('imminent-risk content is rejected', () => {
    expect(isMemorySafeContent("I'm going to do it tonight with pills")).toBe(false);
  });

  it('self-harm method or overdose-seeking content is rejected', () => {
    expect(
      isMemorySafeContent('how many prometrium pills would it take to not wake up'),
    ).toBe(false);
  });

  it('loved-one crisis content is rejected', () => {
    expect(
      isMemorySafeContent('my daughter told me she wants to kill herself'),
    ).toBe(false);
  });

  it('editing safe memory into crisis content is rejected', () => {
    expect(isMemorySafeContent('I want to end it all')).toBe(false);
  });

  it('safe memories pass through the filter for synthesis', () => {
    const memories = [
      'I prefer morning appointments',
      'I work night shifts',
      'My next appointment is August 15',
    ];
    const filtered = memories.filter(isMemorySafeContent);
    expect(filtered).toEqual(memories);
  });

  it('unsafe legacy memory is filtered out before synthesis', () => {
    const memories = [
      'I prefer morning appointments',
      'I want to kill myself',
      'I work night shifts',
    ];
    const filtered = memories.filter(isMemorySafeContent);
    expect(filtered).toEqual(['I prefer morning appointments', 'I work night shifts']);
  });

  it('no rejected content appears in error payload', () => {
    const expectedMessage = "Luna doesn't save crisis-related conversations as memory.";
    expect(expectedMessage).not.toMatch(/kill|suicide|hurt|gun/i);
  });

  it('empty and whitespace-only content is rejected', () => {
    expect(isMemorySafeContent('')).toBe(false);
    expect(isMemorySafeContent('   ')).toBe(false);
  });
});
