import { describe, expect, it } from 'vitest';
import { buildAiFactsPacket } from '../aiFactsPacket';
import { hashAiFactsPacket } from '../aiInsightsCache';
import { isAiForbiddenCategory } from '../aiForbiddenCategories';
import { buildGapCoachMessage } from '../gapCoach';
import type { Insight } from '../../engine/types';
import type {
  Medication,
  MedicationChange,
  Profile,
  SymptomCheckin,
} from '../../types/database';

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
    expect(packet.pulseSeries).toEqual([]);
    expect(packet.doseChangeWindows).toEqual([]);
  });

  it('includes pulse series and dose-change before/after windows', () => {
    const med = {
      id: 'med-1',
      medication_name: 'Estradiol',
      is_active: true,
      end_date: null,
      hormone_category: 'estrogen',
      dose_amount: 1,
      dose_unit: 'mg',
      start_date: '2026-01-01',
    } as Medication;

    const checkins = [
      { checkin_date: '2026-02-01', energy_level: 4, mood_level: 3, sleep_quality: 5 },
      { checkin_date: '2026-02-10', energy_level: 5, mood_level: 4, sleep_quality: 5 },
      { checkin_date: '2026-02-20', energy_level: 6, mood_level: 5, sleep_quality: 6 },
      { checkin_date: '2026-03-05', energy_level: 7, mood_level: 6, sleep_quality: 7 },
      { checkin_date: '2026-03-15', energy_level: 7, mood_level: 7, sleep_quality: 7 },
    ] as SymptomCheckin[];

    const changes = [
      {
        medication_id: 'med-1',
        change_date: '2026-02-15',
        change_type: 'increase',
        notes: null,
      },
    ] as MedicationChange[];

    const packet = buildAiFactsPacket({
      timezone: 'America/Los_Angeles',
      profile: { display_name: 'T', straw_stage: null, menopause_stage: null } as Profile,
      checkins,
      medications: [med],
      medicationChanges: changes,
      labResults: [],
      insights: [],
    });

    expect(packet.pulseSeries.length).toBe(5);
    expect(packet.doseChangeWindows).toHaveLength(1);
    const window = packet.doseChangeWindows[0];
    expect(window.medicationName).toBe('Estradiol');
    expect(window.beforeDays).toBe(28);
    expect(window.afterDays).toBe(42);
    expect(window.energy.beforeCount).toBe(2);
    expect(window.energy.afterCount).toBe(3);
    expect(window.energy.before).toBe(4.5);
    expect(window.energy.after).toBe(6.7);
    expect(window.energy.delta).toBe(2.2);
    expect(JSON.stringify(packet).length).toBeLessThan(24_000);
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
