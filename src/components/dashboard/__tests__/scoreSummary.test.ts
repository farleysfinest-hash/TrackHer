import { describe, expect, it } from 'vitest';
import { buildScoreSummary } from '../scoreSummary';
import type { SymptomCheckin } from '../../../types/database';

function makeCheckin(
  date: string,
  overrides: Partial<SymptomCheckin> = {},
): SymptomCheckin {
  return {
    id: date,
    user_id: 'u1',
    checkin_date: date,
    energy_level: 3,
    mood_level: 3,
    sleep_quality: 2,
    hot_flashes: 2,
    heart_discomfort: 1,
    sleep_problems: 2,
    depressed_mood: 1,
    irritability: 1,
    anxiety: 1,
    exhaustion: 2,
    sexual_problems: 1,
    bladder_problems: 1,
    vaginal_dryness: 1,
    joint_muscle_pain: 2,
    total_score: 14,
    somatic_score: 7,
    psychological_score: 4,
    urogenital_score: 3,
    notes: null,
    created_at: `${date}T12:00:00.000Z`,
    ...overrides,
  } as SymptomCheckin;
}

describe('buildScoreSummary', () => {
  it('scopes days logged and latest scores to the selected range', () => {
    const checkins = [
      makeCheckin('2026-07-20', { total_score: 24, energy_level: 3 }),
      makeCheckin('2026-07-10', { total_score: 20, energy_level: 4 }),
      makeCheckin('2026-05-01', { total_score: 10, energy_level: 5 }),
    ];

    const summary = buildScoreSummary(checkins, {
      start: '2026-06-21',
      end: '2026-07-20',
    });

    expect(summary.mrsValue).toBe(24);
    expect(summary.daysLogged).toBe(2);
    expect(summary.energyValue).toBe(3);
  });

  it('switches latest MRS when the visible window excludes newer check-ins', () => {
    const checkins = [
      makeCheckin('2026-07-01', { total_score: 30 }),
      makeCheckin('2026-01-15', { total_score: 8 }),
    ];

    expect(
      buildScoreSummary(checkins, { start: '2026-06-01', end: '2026-07-21' }).mrsValue,
    ).toBe(30);

    expect(
      buildScoreSummary(checkins, { start: '2026-01-01', end: '2026-01-31' }).mrsValue,
    ).toBe(8);
  });
});
