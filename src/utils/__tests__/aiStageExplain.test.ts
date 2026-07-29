import { describe, expect, it } from 'vitest';
import { clampStageExplain, stageExplainCacheKey } from '../aiStageExplain';

describe('stageExplainCacheKey', () => {
  it('is stable for a stage string', () => {
    expect(stageExplainCacheKey('+1c')).toBe(stageExplainCacheKey('+1C'));
    expect(stageExplainCacheKey('  early  ')).toBe('stage:early');
  });
});

describe('clampStageExplain', () => {
  it('returns null for empty and caps length', () => {
    expect(clampStageExplain('')).toBeNull();
    expect(clampStageExplain('x'.repeat(2000))?.length).toBe(1200);
  });
});
