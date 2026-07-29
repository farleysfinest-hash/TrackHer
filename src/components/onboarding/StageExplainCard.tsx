import { useEffect, useMemo, useState } from 'react';
import {
  buildAiFactsPacket,
  type AiFactsPacketInput,
} from '../../utils/aiFactsPacket';
import {
  readAiInsightCache,
  writeAiInsightCache,
} from '../../utils/aiInsightsCache';
import { invokeStageExplain } from '../../hooks/useAiAssistant';
import { clampStageExplain, stageExplainCacheKey } from '../../utils/aiStageExplain';
import { useAuthStore } from '../../stores/authStore';

interface StageExplainCardProps {
  context: AiFactsPacketInput;
  /** When set, skip facts packet stage and use this (onboarding complete). */
  stageOverride?: string | null;
  className?: string;
}

/**
 * Warm companion explainer for her STRAW / menopause stage.
 * Cached permanently by stage string.
 */
export function StageExplainCard({
  context,
  stageOverride = null,
  className = '',
}: StageExplainCardProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const facts = useMemo(() => buildAiFactsPacket(context), [context]);
  const stage =
    stageOverride?.trim() ||
    facts.profile.strawStage ||
    facts.profile.menopauseStage ||
    null;

  useEffect(() => {
    if (!userId || !stage) {
      setText(null);
      return;
    }
    let cancelled = false;
    const hash = stageExplainCacheKey(stage);
    setLoading(true);

    void (async () => {
      const cached = await readAiInsightCache<{ text?: string }>(
        userId,
        'stage_explain',
        hash,
      );
      if (cancelled) return;
      const fromCache = clampStageExplain(cached?.text);
      if (fromCache) {
        setText(fromCache);
        setLoading(false);
        return;
      }
      const result = await invokeStageExplain(facts);
      if (cancelled) return;
      const clamped = clampStageExplain(result);
      setText(clamped);
      setLoading(false);
      if (clamped) {
        await writeAiInsightCache(userId, 'stage_explain', hash, { text: clamped }, 365);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, stage, facts]);

  if (!stage) return null;
  if (!text && !loading) return null;

  return (
    <div
      className={[
        'rounded-xl border border-sage-200 bg-sage-50/50 p-4 text-left',
        className,
      ].join(' ')}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-sage-500">
        About your stage
      </p>
      {loading && !text ? (
        <p className="mt-2 text-sm text-sage-500">A few words about where you are…</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-sage-700 whitespace-pre-line">
          {text}
        </p>
      )}
    </div>
  );
}
