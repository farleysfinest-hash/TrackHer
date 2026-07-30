import { describe, expect, it } from 'vitest';
import { buildAiFactsPacket } from '../aiFactsPacket';
import { hashAiFactsPacket } from '../aiInsightsCache';
import { isAiForbiddenCategory } from '../aiForbiddenCategories';
import { buildGapCoachMessage } from '../gapCoach';
import type { Insight } from '../../engine/types';
import type { Profile } from '../../types/database';

describe('buildAiFactsPacket', () => {
  it('maps engine insights and omits forbidden categories', () => {
    const insights = [
      {
        id: 'a',
        category: 'trend_alert',
        priority: 'medium',
        title: 'MRS easing',
        body: 'Your total dropped.',
        confidence: 'moderate',
      },
      {
        id: 'b',
        category: 'safeguarding',
        priority: 'high',
        title: 'Hidden',
        body: 'Should not ship to the model.',
        confidence: 'high',
      },
      {
        id: 'c',
        category: 'psych_trajectory',
        priority: 'high',
        title: 'Also hidden',
        body: 'No.',
        confidence: 'high',
      },
      {
        id: 'd',
        category: 'bleeding_red_flag',
        priority: 'high',
        title: 'Bleeding',
        body: 'No.',
        confidence: 'high',
      },
    ] as unknown as Insight[];

    const packet = buildAiFactsPacket({
      timezone: 'America/Los_Angeles',
      profile: { display_name: 'T', straw_stage: null, menopause_stage: null } as Profile,
      checkins: [],
      medications: [],
      medicationChanges: [],
      labResults: [],
      insights,
    });

    expect(packet.engineInsights).toHaveLength(1);
    expect(packet.engineInsights[0].id).toBe('a');
    expect(packet.medications).toEqual([]);
    expect(packet.mrs).toEqual([]);
  });

  it('hashes stably when only generatedAt changes', () => {
    const base = {
      timezone: 'America/Los_Angeles',
      profile: { display_name: 'T', straw_stage: null, menopause_stage: null } as Profile,
      checkins: [],
      medications: [],
      medicationChanges: [],
      labResults: [],
      insights: [] as Insight[],
    };
    const a = buildAiFactsPacket(base);
    const b = { ...buildAiFactsPacket(base), generatedAt: '2099-01-01T00:00:00.000Z' };
    expect(hashAiFactsPacket(a)).toBe(hashAiFactsPacket(b));
  });
});

describe('isAiForbiddenCategory', () => {
  it('flags safeguarding family', () => {
    expect(isAiForbiddenCategory('safeguarding')).toBe(true);
    expect(isAiForbiddenCategory('cardiac_persistence')).toBe(true);
    expect(isAiForbiddenCategory('trend_alert')).toBe(false);
  });
});

describe('buildGapCoachMessage', () => {
  it('returns null when MRS history is enough or no meds', () => {
    expect(buildGapCoachMessage(0, 0)).toBeNull();
    expect(buildGapCoachMessage(2, 3)).toBeNull();
  });

  it('nudges when meds exist and MRS is thin', () => {
    expect(buildGapCoachMessage(1, 0)).toMatch(/medication/i);
    expect(buildGapCoachMessage(1, 1)).toMatch(/check-in/i);
  });
});
