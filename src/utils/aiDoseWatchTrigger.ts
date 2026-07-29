import { buildAiFactsPacket, type AiFactsPacketInput } from './aiFactsPacket';
import { writeAiInsightCache } from './aiInsightsCache';
import { clampDoseWatchPack, doseWatchCacheKey } from './aiDoseWatch';
import { invokeDoseWatch } from '../hooks/useAiAssistant';

/**
 * Fire-and-forget companion note after a dose change saves.
 */
export function triggerAiDoseWatch(
  input: AiFactsPacketInput,
  changeDate: string,
  medicationName: string,
): void {
  const userId = input.profile?.id;
  if (!userId || !medicationName.trim()) return;

  void (async () => {
    try {
      const facts = buildAiFactsPacket(input);
      const result = await invokeDoseWatch(facts);
      const clamped = clampDoseWatchPack(result);
      if (!clamped) return;
      const hash = doseWatchCacheKey(changeDate, medicationName);
      await writeAiInsightCache(userId, 'dose_watch', hash, clamped, 14);
    } catch (e) {
      console.warn('AI dose watch failed:', e);
    }
  })();
}
