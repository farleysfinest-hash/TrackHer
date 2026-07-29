import type { AiFactsPacket } from './aiFactsPacket';
import type { InsightType } from '../types/database';
import { supabase } from '../lib/supabase';

/** Stable hash of the facts packet for cache keys (excludes generatedAt). */
export function hashAiFactsPacket(facts: AiFactsPacket): string {
  const { generatedAt: _generatedAt, ...rest } = facts;
  const json = JSON.stringify(rest);
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export async function readAiInsightCache<T>(
  userId: string,
  insightType: InsightType,
  dataHash: string,
): Promise<T | null> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('insight_content, expires_at')
    .eq('user_id', userId)
    .eq('insight_type', insightType)
    .eq('data_hash', dataHash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.insight_content as T;
}

export async function writeAiInsightCache(
  userId: string,
  insightType: InsightType,
  dataHash: string,
  content: unknown,
  ttlDays = 7,
): Promise<void> {
  const expires = new Date();
  expires.setDate(expires.getDate() + ttlDays);

  const { error } = await supabase.from('ai_insights').upsert(
    {
      user_id: userId,
      insight_type: insightType,
      data_hash: dataHash,
      insight_content: content as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      expires_at: expires.toISOString(),
    },
    { onConflict: 'user_id,insight_type,data_hash' },
  );

  if (error) {
    // Unique index may not exist until migration 030 is applied — fall back to insert.
    console.warn('ai_insights cache write failed:', error.message);
  }
}
