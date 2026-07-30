import { describe, expect, it } from 'vitest';
import {
  clampVisitDebriefPack,
  isFollowUpRedundantWithSummary,
} from '../aiVisitDebrief';

describe('clampVisitDebriefPack', () => {
  it('returns null without planSummary', () => {
    expect(clampVisitDebriefPack({ followUps: [] })).toBeNull();
  });

  it('keeps risk-only packs when crisis screening fires', () => {
    const pack = clampVisitDebriefPack({
      planSummary: '',
      followUps: [],
      risk: 'crisis',
      riskReply: 'Please call or text 988…',
    });
    expect(pack?.risk).toBe('crisis');
    expect(pack?.riskReply).toMatch(/988/);
    expect(pack?.planSummary).toBe('');
  });

  it('clamps followUps and nulls empty timeframe', () => {
    const pack = clampVisitDebriefPack({
      planSummary: 'Stay on current patch; recheck labs.',
      followUps: [
        { label: 'Book labs', timeframe: '6 weeks' },
        { label: '  ', timeframe: 'soon' },
        { label: 'Call if bleeding worsens', timeframe: '  ' },
        { label: 'a' },
        { label: 'b' },
        { label: 'c' },
        { label: 'd' },
      ],
    });
    expect(pack?.followUps).toHaveLength(5);
    expect(pack?.followUps[0]).toEqual({
      label: 'Book labs',
      timeframe: '6 weeks',
      done: false,
    });
    expect(pack?.followUps[1]).toEqual({
      label: 'Call if bleeding worsens',
      timeframe: null,
      done: false,
    });
  });

  it('drops checklist items that only restate the summary', () => {
    const pack = clampVisitDebriefPack({
      planSummary:
        'Your clinician advised increasing progesterone. Please keep track of any changes in your mood and energy levels as you proceed.',
      followUps: [
        { label: 'Book labs in 6 weeks', timeframe: '6 weeks' },
        { label: 'Monitor mood and energy levels', timeframe: 'ongoing' },
        { label: 'Discuss any new symptoms with your clinician', timeframe: 'as needed' },
      ],
    });
    expect(pack?.followUps.map((f) => f.label)).toEqual([
      'Book labs in 6 weeks',
      'Discuss any new symptoms with your clinician',
    ]);
  });
});

describe('isFollowUpRedundantWithSummary', () => {
  it('flags mood/energy monitor when summary already says track mood and energy', () => {
    expect(
      isFollowUpRedundantWithSummary(
        'Monitor mood and energy levels',
        'Please keep track of any changes in your mood and energy levels as you proceed.',
      ),
    ).toBe(true);
  });

  it('keeps concrete booking actions', () => {
    expect(
      isFollowUpRedundantWithSummary(
        'Book labs in 6 weeks',
        'Please keep track of any changes in your mood and energy levels as you proceed.',
      ),
    ).toBe(false);
  });
});
