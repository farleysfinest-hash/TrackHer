import type { EngineInput, PatternEngineResult } from './types';

type CanonicalValue =
  | ['null']
  | ['undefined']
  | ['boolean', boolean]
  | ['string', string]
  | ['number', string]
  | ['array-hole']
  | ['array', CanonicalValue[]]
  | ['object', Array<[string, CanonicalValue]>];

class UnsupportedCacheKeyValueError extends Error {}

function canonicalize(value: unknown, ancestors: WeakSet<object>): CanonicalValue {
  if (value === null) return ['null'];
  if (value === undefined) return ['undefined'];
  if (typeof value === 'boolean') return ['boolean', value];
  if (typeof value === 'string') return ['string', value];
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return ['number', 'NaN'];
    if (value === Infinity) return ['number', 'Infinity'];
    if (value === -Infinity) return ['number', '-Infinity'];
    if (Object.is(value, -0)) return ['number', '-0'];
    return ['number', String(value)];
  }

  if (typeof value !== 'object') {
    throw new UnsupportedCacheKeyValueError();
  }

  if (ancestors.has(value)) {
    throw new UnsupportedCacheKeyValueError();
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      const canonicalItems: CanonicalValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        canonicalItems.push(
          index in value ? canonicalize(value[index], ancestors) : ['array-hole'],
        );
      }
      return ['array', canonicalItems];
    }

    const prototype = Object.getPrototypeOf(value);
    if (
      (prototype !== Object.prototype && prototype !== null) ||
      Object.getOwnPropertySymbols(value).length > 0
    ) {
      throw new UnsupportedCacheKeyValueError();
    }

    const canonicalEntries = Object.keys(value)
      .sort()
      .map((key): [string, CanonicalValue] => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor)) {
          throw new UnsupportedCacheKeyValueError();
        }
        return [key, canonicalize(descriptor.value, ancestors)];
      });
    return ['object', canonicalEntries];
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Returns a deterministic key for cache-safe input. Unsupported values return null so the
 * pattern engine can run normally without risking a false cache hit or a user-visible crash.
 */
export function buildEngineInputCacheKey(input: EngineInput): string | null {
  try {
    return JSON.stringify(canonicalize(input, new WeakSet()));
  } catch {
    return null;
  }
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
