import type { EngineInput, PatternEngineResult } from './types';

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const canonical: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      canonical[key] = canonicalize(obj[key]);
    }
    return canonical;
  }

  throw new Error(`Cannot canonicalize unsupported value type: ${typeof value}`);
}

export function buildEngineInputCacheKey(input: EngineInput): string {
  const canonical = canonicalize(input);
  return JSON.stringify(canonical);
}

let cache: {
  ownerId: string | null;
  key: string;
  result: PatternEngineResult;
} | null = null;

export function getCachedEngineResult(
  ownerId: string | null,
  key: string,
): PatternEngineResult | null {
  if (cache && cache.ownerId === ownerId && cache.key === key) {
    return cache.result;
  }
  return null;
}

export function peekCachedEngineResult(ownerId: string | null): PatternEngineResult | null {
  if (cache && cache.ownerId === ownerId) {
    return cache.result;
  }
  return null;
}

export function setCachedEngineResult(
  ownerId: string | null,
  key: string,
  result: PatternEngineResult,
): void {
  cache = { ownerId, key, result };
}

export function clearEngineResultCache(): void {
  cache = null;
}
