import { describe, expect, it } from 'vitest';
import { BoundedTtlCache } from '../../../supabase/functions/ai-assistant/boundedTtlCache';
import {
  corsHeadersForOrigin,
  isAllowedRequestOrigin,
} from '../../../supabase/functions/ai-assistant/httpSecurity';
import {
  AI_RATE_LIMIT_HIGH_CEILING_CAPACITY,
  aiActionCost,
  parseSharedRateLimitDecision,
} from '../../../supabase/functions/ai-assistant/rateLimitPolicy';

describe('Luna shared rate-limit policy', () => {
  it('charges expensive work more heavily than ordinary chat', () => {
    expect(aiActionCost('chat')).toBe(1);
    expect(aiActionCost('improve_insights')).toBe(3);
    expect(aiActionCost('lab_report_extract')).toBe(4);
  });

  it('rejects unknown actions before any capacity is consumed', () => {
    expect(aiActionCost('unknown_action')).toBeNull();
    expect(parseSharedRateLimitDecision(null)).toBeNull();
    expect(parseSharedRateLimitDecision([{ allowed: true }])).toBeNull();
  });

  it('exposes a higher isolate ceiling for risk-adjacent chat', () => {
    expect(AI_RATE_LIMIT_HIGH_CEILING_CAPACITY).toBe(120);
  });

  it('keeps ordinary and high-ceiling durable capacities distinct', () => {
    // Ordinary durable budget remains 45; migration 037 adds p_high_ceiling=120.
    // True crisis chat bypasses rate limiting entirely in handleRequest.
    expect(AI_RATE_LIMIT_HIGH_CEILING_CAPACITY).toBeGreaterThan(45);
  });

  it('normalizes a valid atomic RPC decision', () => {
    expect(
      parseSharedRateLimitDecision([
        { allowed: false, retry_after_seconds: 14, remaining_units: 0 },
      ]),
    ).toEqual({ allowed: false, retryAfterSeconds: 14, remainingUnits: 0 });
  });
});

describe('Luna Edge origin policy', () => {
  it('allows the app, Capacitor, and local development origins', () => {
    expect(isAllowedRequestOrigin('https://trackher.app')).toBe(true);
    expect(isAllowedRequestOrigin('capacitor://localhost')).toBe(true);
    expect(isAllowedRequestOrigin('http://localhost:5173')).toBe(true);
  });

  it('rejects arbitrary browser origins and permits configured additions', () => {
    expect(isAllowedRequestOrigin('https://attacker.example')).toBe(false);
    expect(
      isAllowedRequestOrigin(
        'https://preview.trackher.example',
        'https://preview.trackher.example',
      ),
    ).toBe(true);
  });

  it('does not emit a wildcard and varies responses by allowed origin', () => {
    const headers = corsHeadersForOrigin('https://trackher.app') as Record<string, string>;
    expect(headers['Access-Control-Allow-Origin']).toBe('https://trackher.app');
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    expect(headers.Vary).toBe('Origin');
  });

  it('allows requests without a browser Origin header', () => {
    expect(isAllowedRequestOrigin(null)).toBe(true);
    expect(corsHeadersForOrigin(null)).not.toHaveProperty('Access-Control-Allow-Origin');
  });
});

describe('bounded analysis-tool cache', () => {
  it('expires entries and removes them on access', () => {
    let now = 1_000;
    const cache = new BoundedTtlCache<number>(2, () => now);
    cache.set('a', 1, 100);
    expect(cache.get('a')).toBe(1);
    now = 1_100;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the oldest entry at its hard size limit', () => {
    const cache = new BoundedTtlCache<number>(2, () => 1_000);
    cache.set('a', 1, 1_000);
    cache.set('b', 2, 1_000);
    cache.set('c', 3, 1_000);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });
});
