import { describe, expect, it } from 'vitest';
import { getSymptomByKey, SYMPTOM_CATALOG } from '../../data/symptoms';

/**
 * Companion symptom_translate must only accept catalog keys.
 * Mirrors the Edge Function filter used in ai-assistant.
 */
function filterTranslateSuggestions(
  suggestions: Array<{ key: string; label?: string; reason?: string }>,
) {
  const allowed = new Map(SYMPTOM_CATALOG.map((s) => [s.key, s.label]));
  return suggestions
    .filter((s) => allowed.has(s.key))
    .map((s) => ({
      key: s.key,
      label: allowed.get(s.key) ?? s.label ?? s.key,
      reason: s.reason ?? '',
    }));
}

describe('symptom translate catalog filter', () => {
  it('drops invented keys', () => {
    const sample = SYMPTOM_CATALOG[0];
    const filtered = filterTranslateSuggestions([
      { key: sample.key, label: 'x', reason: 'ok' },
      { key: 'not-a-real-symptom-key', label: 'fake', reason: 'nope' },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].key).toBe(sample.key);
    expect(getSymptomByKey(filtered[0].key)?.label).toBe(filtered[0].label);
  });
});
