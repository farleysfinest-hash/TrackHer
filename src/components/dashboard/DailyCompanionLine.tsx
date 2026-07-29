import { useEffect, useMemo, useState } from 'react';
import {
  buildAiFactsPacket,
  type AiFactsPacketInput,
} from '../../utils/aiFactsPacket';
import {
  hashAiFactsPacket,
  readAiInsightCache,
  writeAiInsightCache,
} from '../../utils/aiInsightsCache';
import { invokeDailyLine } from '../../hooks/useAiAssistant';
import {
  clampDailyLine,
  dailyLineCacheKey,
  shouldSkipDailyLine,
} from '../../utils/aiDailyLine';
import { useAuthStore } from '../../stores/authStore';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';

interface DailyCompanionLineProps {
  context: AiFactsPacketInput;
}

/**
 * Soft one-line companion note under the dashboard greeting.
 * Silent on empty/error — no spinner.
 */
export function DailyCompanionLine({ context }: DailyCompanionLineProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const today = getLocalDateISO(timezone);
  const [line, setLine] = useState<string | null>(null);

  const facts = useMemo(() => buildAiFactsPacket(context), [context]);
  const factsHash = useMemo(() => hashAiFactsPacket(facts), [facts]);
  const skip = shouldSkipDailyLine({
    mrsCount: facts.mrs.length,
    pulseCount: facts.pulseRecent.daysSampled,
    medCount: facts.medications.length,
  });

  useEffect(() => {
    if (!userId || skip) {
      setLine(null);
      return;
    }
    let cancelled = false;
    const cacheHash = dailyLineCacheKey(today, factsHash);

    void (async () => {
      const cached = await readAiInsightCache<{ line?: string }>(
        userId,
        'daily_line',
        cacheHash,
      );
      if (cancelled) return;
      const fromCache = clampDailyLine(cached?.line);
      if (fromCache) {
        setLine(fromCache);
        return;
      }

      // At most one model call per local day (any facts hash).
      try {
        const dayFlag = `trackher_daily_line_${today}`;
        if (localStorage.getItem(dayFlag) === '1') {
          setLine(null);
          return;
        }
      } catch {
        // ignore
      }

      const text = await invokeDailyLine(facts);
      if (cancelled) return;
      const clamped = clampDailyLine(text);
      if (!clamped) {
        setLine(null);
        return;
      }
      setLine(clamped);
      await writeAiInsightCache(userId, 'daily_line', cacheHash, { line: clamped }, 2);
      try {
        localStorage.setItem(`trackher_daily_line_${today}`, '1');
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, skip, today, factsHash, facts]);

  if (!line) return null;

  return (
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-sage-600 italic">{line}</p>
  );
}
