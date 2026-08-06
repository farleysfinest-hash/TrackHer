import { describe, expect, it } from 'vitest';
import {
  classifyCompanionShape,
  isMemorySafeContent,
  looksRiskAdjacent,
} from '../aiCompanionScripts';
import {
  currentMessageHasCrisisSignal,
  deterministicCurrentCrisisTier,
} from '../../../supabase/functions/ai-assistant/crisisController';

import { clampJournalExtract } from '../aiJournalExtract';
import { clampVisitDebriefPack } from '../aiVisitDebrief';

describe('Batch A crisis-routing invariants', () => {
  const negatedDanger = [
    "I'm not going to hurt myself.",
    'I am not going to kill myself.',
    'I no longer want to hurt myself.',
    'I am no longer going to hurt myself.',
    'Not going to hurt myself.',
  ];

  it.each(negatedDanger)('does not reinterpret negated danger: %s', (message) => {
    expect(deterministicCurrentCrisisTier(message)).toBeNull();
    expect(currentMessageHasCrisisSignal(message)).toBe(false);
  });

  const directCompoundDanger: Array<[string, 'crisis' | 'crisis_imminent']> = [
    ["I'm safe now, but I'm going to do it tonight.", 'crisis_imminent'],
    ["I'm safe now, but I still want to hurt myself.", 'crisis'],
  ];

  it.each(directCompoundDanger)(
    'keeps deterministic compound danger active: %s',
    (message, tier) => {
      expect(deterministicCurrentCrisisTier(message)).toBe(tier);
      expect(currentMessageHasCrisisSignal(message)).toBe(true);
    },
  );

  const modelBackstopCompound = [
    "I'm safe now, but I have a knife.",
    "I'm safe now, but I have a pistol.",
    "I'm safe now, but I could jump off the bridge.",
    "I'm safe now, but I cut myself.",
    "I'm safe now, but I don't think I'm going to be around tomorrow.",
    "I'm safe now, but I don't plan on making it through the night.",
  ];

  it.each(modelBackstopCompound)(
    'detects danger signal in compound resolution + danger: %s',
    (message) => {
      expect(currentMessageHasCrisisSignal(message)).toBe(true);
    },
  );

  const expandedPassiveDanger = [
    'I do not plan on making it through the night.',
    'I do not think I am going to be around tomorrow.',
    'I am safe now, but I do not plan on making it through the night.',
    'I am safe now, but I do not think I am going to be around tomorrow.',
  ];

  it.each(expandedPassiveDanger)('fails closed for expanded passive danger: %s', (message) => {
    expect(looksRiskAdjacent(message)).toBe(true);
    expect(currentMessageHasCrisisSignal(message)).toBe(true);
    expect(isMemorySafeContent(message)).toBe(false);
  });

  const negatedClinicianReports = [
    'My doctor asked if I wanted to kill myself and I said no.',
    'My therapist asked me whether I was thinking about suicide; I answered no.',
    'My clinician asked if I want to hurt myself and I said no.',
    "My doctor asked if I wanted to kill myself and I said no, we're adjusting my dose",
  ];

  it.each(negatedClinicianReports)(
    'does not treat a clearly negated clinician screening report as current danger: %s',
    (message) => {
    expect(classifyCompanionShape(message)).toBeNull();
    expect(deterministicCurrentCrisisTier(message)).toBeNull();
    expect(currentMessageHasCrisisSignal(message)).toBe(false);
    expect(looksRiskAdjacent(message)).toBe(false);
    // Screening language (even negated / with trailing dose talk) stays out of memory.
    expect(isMemorySafeContent(message)).toBe(false);
    },
  );

  it('does not suppress danger appended to a negated clinician screening report', () => {
    const message = 'My doctor asked if I wanted to kill myself and I said no, but I want to die now.';
    expect(deterministicCurrentCrisisTier(message)).toBe('crisis');
    expect(currentMessageHasCrisisSignal(message)).toBe(true);
    expect(looksRiskAdjacent(message)).toBe(true);
    expect(isMemorySafeContent(message)).toBe(false);
  });

  const benignAbsence = [
    "I won't be here tomorrow because I'm traveling.",
    "I won't be here tomorrow for my appointment.",
    "I don't think I'll be here tomorrow because I have a flight.",
  ];

  it.each(benignAbsence)('keeps benign future absence out of crisis routing: %s', (message) => {
    expect(looksRiskAdjacent(message)).toBe(false);
    expect(currentMessageHasCrisisSignal(message)).toBe(false);
    expect(isMemorySafeContent(message)).toBe(true);
  });
});

describe('Batch A risk-watch middle tier', () => {
  const softMoodMessage = 'I feel so exhausted and low lately.';

  it('soft mood without SI is not a crisis signal', () => {
    expect(deterministicCurrentCrisisTier(softMoodMessage)).toBeNull();
    expect(currentMessageHasCrisisSignal(softMoodMessage)).toBe(false);
    expect(looksRiskAdjacent(softMoodMessage)).toBe(false);
  });

  it('trusts classifier none for HRT/casual method-word false positives', () => {
    expect(currentMessageHasCrisisSignal("I'm hanging in there")).toBe(false);
    expect(currentMessageHasCrisisSignal('can I overdose on my patches?')).toBe(false);
  });

  it('detects standalone method signal', () => {
    expect(deterministicCurrentCrisisTier('I have a knife')).toBeNull();
    expect(currentMessageHasCrisisSignal('I have a knife')).toBe(true);
  });
});

describe('Batch A non-chat risk payloads', () => {
  it('preserves loved-one journal risk while removing capture suggestions', () => {
    const result = clampJournalExtract(
      {
        symptoms: [{ key: 'anxiety', reason: 'drop this' }],
        events: [{ type: 'note', medicationName: null, note: 'drop this' }],
        risk: 'loved_one',
        riskReply: 'Use the support actions above. Call or text 988.',
      },
      new Set(['anxiety']),
      new Set(),
    );
    expect(result).toMatchObject({
      symptoms: [],
      events: [],
      risk: 'loved_one',
    });
    expect(result.riskReply).toMatch(/988/);
  });

  it('preserves loved-one visit-debrief risk without an ordinary plan', () => {
    const result = clampVisitDebriefPack({
      planSummary: '',
      followUps: [{ label: 'ordinary follow-up' }],
      risk: 'loved_one',
      riskReply: 'Use the support actions above. Call or text 988.',
    });
    expect(result).toMatchObject({
      planSummary: '',
      followUps: [],
      risk: 'loved_one',
    });
    expect(result?.riskReply).toMatch(/988/);
  });
});
