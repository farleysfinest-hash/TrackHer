import { describe, expect, it, vi } from 'vitest';
import {
  classifyCompanionShape,
  isMemorySafeContent,
  looksRiskAdjacent,
} from '../aiCompanionScripts';
import {
  attemptCrisisStateClear,
  currentMessageHasCrisisSignal,
  decideCrisisTurn,
  deterministicCurrentCrisisTier,
  hasExplicitCrisisResolution,
  indicatesCrisisResolution,
  tierForCurrentCrisisSubject,
} from '../../../supabase/functions/ai-assistant/crisisController';
import { localCrisisStateFromChatResult } from '../../hooks/useAiAssistant';
import { clampJournalExtract } from '../aiJournalExtract';
import { clampVisitDebriefPack } from '../aiVisitDebrief';

describe('Batch A crisis-routing invariants', () => {
  const explicitResolutions = [
    "I'm safe now.",
    'I am safe now.',
    'I got emergency help.',
    "I'm at the hospital.",
    'A crisis counselor is with me.',
  ];

  it.each(explicitResolutions)('recognizes standalone resolution: %s', (message) => {
    expect(hasExplicitCrisisResolution(message)).toBe(true);
    expect(indicatesCrisisResolution(message)).toBe(true);
  });

  it('does not treat another person getting help as the user resolving', () => {
    expect(hasExplicitCrisisResolution('My friend got emergency help.')).toBe(false);
  });

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
    expect(indicatesCrisisResolution(message)).toBe(true);
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
      expect(indicatesCrisisResolution(message)).toBe(false);
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
    'lets a positive model classification override resolution: %s',
    (message) => {
      expect(
        decideCrisisTurn({
          message,
          priorTier: 'crisis',
          classification: { status: 'ok', tier: 'crisis' },
        }),
      ).toEqual({ action: 'crisis', tier: 'crisis' });
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
    expect(indicatesCrisisResolution(message)).toBe(false);
    expect(
      decideCrisisTurn({
        message,
        priorTier: null,
        classification: { status: 'unavailable' },
      }),
    ).toEqual({ action: 'classifier_unavailable' });
  });

  const negatedClinicianReports = [
    'My doctor asked if I wanted to kill myself and I said no.',
    'My therapist asked me whether I was thinking about suicide; I answered no.',
    'My clinician asked if I want to hurt myself and I said no.',
  ];

  it.each(negatedClinicianReports)(
    'does not treat a clearly negated clinician screening report as current danger: %s',
    (message) => {
    expect(classifyCompanionShape(message)).toBeNull();
    expect(deterministicCurrentCrisisTier(message)).toBeNull();
    expect(currentMessageHasCrisisSignal(message)).toBe(false);
    expect(looksRiskAdjacent(message)).toBe(false);
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
    expect(
      decideCrisisTurn({
        message,
        priorTier: null,
        classification: { status: 'ok', tier: null },
      }),
    ).toEqual({ action: 'normal' });
  });

  const novelSelfRisk = [
    'I want to go to sleep and not come back',
    "I don't think I'll be here tomorrow",
    "There's no point in being alive",
    "I don't plan on making it through the night",
  ];

  it.each(novelSelfRisk)('routes model-classified novel self-risk: %s', (message) => {
    expect(
      decideCrisisTurn({
        message,
        priorTier: null,
        classification: { status: 'ok', tier: 'crisis' },
      }),
    ).toEqual({ action: 'crisis', tier: 'crisis' });
    expect(isMemorySafeContent(message)).toBe(false);
  });

  it('routes novel loved-one risk to the loved-one subject', () => {
    const message = 'someone I love told me there is no point in being alive';
    expect(classifyCompanionShape(message)).toBeNull();
    expect(
      decideCrisisTurn({
        message,
        priorTier: 'crisis',
        classification: { status: 'ok', tier: 'loved_one' },
      }),
    ).toEqual({ action: 'crisis', tier: 'loved_one' });
    expect(isMemorySafeContent(message)).toBe(false);
  });

  it('uses the current loved-one subject instead of a prior self-crisis rank', () => {
    expect(tierForCurrentCrisisSubject('loved_one', 'crisis_imminent')).toBe('loved_one');
  });

  it('uses current self-danger instead of a prior loved-one subject', () => {
    expect(tierForCurrentCrisisSubject('crisis', 'loved_one')).toBe('crisis');
  });

  it('retains higher prior severity only within the same subject', () => {
    expect(tierForCurrentCrisisSubject('crisis', 'crisis_imminent')).toBe(
      'crisis_imminent',
    );
  });

  it('does not resolve when the model classifier is unavailable', () => {
    expect(
      decideCrisisTurn({
        message: "I'm safe now.",
        priorTier: 'crisis',
        classification: { status: 'unavailable' },
      }),
    ).toEqual({ action: 'crisis', tier: 'crisis' });
  });

  it('does not resolve when the model finds current danger', () => {
    expect(
      decideCrisisTurn({
        message: "I'm safe now, but I don't plan on making it through the night.",
        priorTier: 'crisis',
        classification: { status: 'ok', tier: 'crisis' },
      }),
    ).toEqual({ action: 'crisis', tier: 'crisis' });
  });

  it('resolves only after explicit safety and a model none result', () => {
    expect(
      decideCrisisTurn({
        message: "I'm safe now.",
        priorTier: 'crisis',
        classification: { status: 'ok', tier: null },
      }),
    ).toEqual({ action: 'resolve' });
  });
});

describe('Batch A persistence invariants', () => {
  it('reports a failed crisis-state clear instead of claiming success', async () => {
    const result = await attemptCrisisStateClear(async () => ({
      error: { message: 'database unavailable' },
    }));
    expect(result).toEqual({ cleared: false, errorMessage: 'database unavailable' });
  });

  it('reports a thrown crisis-state clear instead of claiming success', async () => {
    const result = await attemptCrisisStateClear(async () => {
      throw new Error('network unavailable');
    });
    expect(result).toEqual({ cleared: false, errorMessage: 'network unavailable' });
  });

  it('reports a successful crisis-state clear', async () => {
    const clear = vi.fn(async () => ({ error: null }));
    await expect(attemptCrisisStateClear(clear)).resolves.toEqual({
      cleared: true,
      errorMessage: null,
    });
    expect(clear).toHaveBeenCalledOnce();
  });

  it('creates immediate local safety state from the Edge response', () => {
    const state = localCrisisStateFromChatResult(
      'user-1',
      {
        tier: 'crisis',
        responseCount: 2,
        showSafetyPanel: true,
        expiresAt: '2026-08-03T00:00:00.000Z',
      },
      new Date('2026-08-01T00:00:00.000Z'),
    );
    expect(state).toMatchObject({
      user_id: 'user-1',
      tier: 'crisis',
      response_count: 2,
      presented_actions: ['support_panel'],
      expires_at: '2026-08-03T00:00:00.000Z',
    });
  });
});

describe('Batch A non-chat risk payloads', () => {
  it('preserves loved-one journal risk while removing capture suggestions', () => {
    const result = clampJournalExtract(
      {
        symptoms: [{ key: 'anxiety', reason: 'drop this' }],
        events: [{ type: 'note', medicationName: null, note: 'drop this' }],
        risk: 'loved_one',
        riskReply: 'Use the support actions below. Call or text 988.',
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
      riskReply: 'Use the support actions below. Call or text 988.',
    });
    expect(result).toMatchObject({
      planSummary: '',
      followUps: [],
      risk: 'loved_one',
    });
    expect(result?.riskReply).toMatch(/988/);
  });
});
