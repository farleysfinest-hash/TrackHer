import { describe, expect, it } from 'vitest';
import { searchSymptomCatalog, SYMPTOM_CATALOG } from '../symptoms';
import { SYMPTOM_BODY_SYSTEM_LABELS } from '../../types/symptoms';

function computeRank(label: string, bodyLabel: string, q: string): number {
  const lowerLabel = label.toLowerCase();
  const lowerBody = bodyLabel.toLowerCase();
  if (lowerLabel.startsWith(q)) return 0;
  if (lowerLabel.split(/[\s/]+/).some((word) => word.startsWith(q))) return 1;
  if (lowerBody.startsWith(q) || lowerBody.split(/[\s/]+/).some((word) => word.startsWith(q))) {
    return 2;
  }
  return 3;
}

describe('searchSymptomCatalog', () => {
  it('returns hot_flashes first for "hot flashes"', () => {
    const results = searchSymptomCatalog('hot flashes');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].key).toBe('hot_flashes');
  });

  it('ranks prefix matches before mid-word substring matches for "d"', () => {
    const q = 'd';
    const results = searchSymptomCatalog(q, 200);
    expect(results.length).toBeGreaterThan(0);

    const ranks = results.map((s) =>
      computeRank(s.label, SYMPTOM_BODY_SYSTEM_LABELS[s.bodySystem], q),
    );
    const rank0Indices = ranks.map((r, i) => (r === 0 ? i : -1)).filter((i) => i >= 0);
    const rank3Indices = ranks.map((r, i) => (r === 3 ? i : -1)).filter((i) => i >= 0);

    expect(rank0Indices.length).toBeGreaterThan(0);
    expect(rank3Indices.length).toBeGreaterThan(0);
    expect(Math.max(...rank0Indices)).toBeLessThan(Math.min(...rank3Indices));
  });

  it('preserves catalog order within the same rank', () => {
    const q = 'd';
    const results = searchSymptomCatalog(q, 200);
    const rank0Keys = results
      .filter((s) => computeRank(s.label, SYMPTOM_BODY_SYSTEM_LABELS[s.bodySystem], q) === 0)
      .map((s) => s.key);

    const catalogRank0Keys = SYMPTOM_CATALOG.filter(
      (s) => computeRank(s.label, SYMPTOM_BODY_SYSTEM_LABELS[s.bodySystem], q) === 0,
    ).map((s) => s.key);

    expect(rank0Keys).toEqual(catalogRank0Keys);
  });

  it('matches symptoms by body-system label', () => {
    const results = searchSymptomCatalog('vasomotor');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.bodySystem === 'vasomotor')).toBe(true);
  });

  it('respects the limit parameter', () => {
    const results = searchSymptomCatalog('a', 3);
    expect(results).toHaveLength(3);
  });

  it('returns empty array for empty and whitespace-only queries', () => {
    expect(searchSymptomCatalog('')).toEqual([]);
    expect(searchSymptomCatalog('   ')).toEqual([]);
  });

  it('returns empty array when nothing matches', () => {
    expect(searchSymptomCatalog('zzzz')).toEqual([]);
  });
});
