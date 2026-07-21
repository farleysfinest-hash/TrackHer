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
    expect(summary.energyValue).toBe('3.5');
  });

  it('changes period trend when the window includes an earlier MRS', () => {
    const checkins = [
      makeCheckin('2026-07-20', { id: 'late', total_score: 24, energy_level: 3 }),
      makeCheckin('2026-07-01', { id: 'mid', total_score: 20, energy_level: 3 }),
      makeCheckin('2026-05-01', { id: 'early', total_score: 10, energy_level: 5 }),
    ];

    const last30 = buildScoreSummary(checkins, {
      start: '2026-06-21',
      end: '2026-07-20',
    });
    // 20 → 24 within 30d window
    expect(last30.burdenHeadline).toBe('Worth watching');
    expect(last30.burdenDetail).toContain('over this period');
    expect(last30.mrsSubtext).toContain('avg 22');

    const last90 = buildScoreSummary(checkins, {
      start: '2026-04-22',
      end: '2026-07-20',
    });
    // 10 → 24 within 90d window — different delta
    expect(last90.burdenDetail).toContain('14 pts');
    expect(last90.energyValue).toBe('3.7');
  });
});
