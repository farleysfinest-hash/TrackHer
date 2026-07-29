import { describe, expect, it } from 'vitest';
import { clampVisitDebriefPack } from '../aiVisitDebrief';

describe('clampVisitDebriefPack', () => {
  it('returns null without planSummary', () => {
    expect(clampVisitDebriefPack({ followUps: [] })).toBeNull();
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
});
