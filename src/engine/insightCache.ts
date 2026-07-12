import type { EngineInput } from './types';
import type { PatternEngineResult } from './types';

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function hashEngineInput(input: EngineInput): string {
  const payload = {
    tz: input.timezone,
    checkins: input.checkins.map((c) => ({
      id: c.id,
      d: c.checkin_date,
      t: c.total_score,
      mc: c.mrs_complete,
      e: c.energy_level,
      m: c.mood_level,
      s: c.sleep_quality,
      bd: c.is_backdated,
    })),
    changes: input.medicationChanges.map((c) => ({
      id: c.id,
      d: c.change_date,
      t: c.change_type,
      m: c.medication_id,
    })),
    labs: input.labResults.map((l) => ({
      id: l.id,
      d: l.draw_date,
    })),
    meds: input.medications.map((m) => ({
      id: m.id,
      a: m.is_active,
      sd: m.start_date,
    })),
    ext: input.extendedSymptoms.length,
    admins: input.administrations.length,
  };
  return simpleHash(JSON.stringify(payload));
}

let cache: { hash: string; result: PatternEngineResult } | null = null;

export function getCachedEngineResult(hash: string): PatternEngineResult | null {
  if (cache?.hash === hash) return cache.result;
  return null;
}

export function peekCachedEngineResult(): PatternEngineResult | null {
  return cache?.result ?? null;
}

export function setCachedEngineResult(hash: string, result: PatternEngineResult): void {
  cache = { hash, result };
}

export function clearEngineResultCache(): void {
  cache = null;
}
