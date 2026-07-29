import { useEffect, useMemo, useRef, useState } from 'react';
import type { Insight } from '../engine/types';
import { useAuthStore } from '../stores/authStore';
import {
  buildAiFactsPacket,
  type AiFactsPacketInput,
} from '../utils/aiFactsPacket';
import { isAiForbiddenCategory } from '../utils/aiForbiddenCategories';
import {
  hashAiFactsPacket,
  readAiInsightCache,
  writeAiInsightCache,
} from '../utils/aiInsightsCache';
import {
  invokeImproveInsights,
  type AiCandidate,
  type PolishedInsight,
} from './useAiAssistant';

export interface AiNoticedCandidate extends AiCandidate {
  id: string;
}

interface ImproveCachePayload {
  polished: PolishedInsight[];
  candidates: AiCandidate[];
}

const POLISH_SESSION_KEY = 'trackher_ai_polish_hash';

/**
 * Background companion layer: polish engine copy + soft "AI noticed" candidates.
 * Engine insights remain authoritative; polish is UI-only by id.
 *
 * Debounced and keyed only on dataHash so Insights data settling / HMR does not
 * fire a storm of OpenAI calls that can crash the browser tab.
 */
export function useAiInsightLayer(
  aiContext: AiFactsPacketInput,
  insights: Insight[],
  enabled: boolean,
) {
  const userId = useAuthStore((s) => s.user?.id);
  const [polishMap, setPolishMap] = useState<Record<string, PolishedInsight>>({});
  const [candidates, setCandidates] = useState<AiNoticedCandidate[]>([]);
  const [isPolishing, setIsPolishing] = useState(false);
  const lastHashRef = useRef<string | null>(null);
  const insightsRef = useRef(insights);
  insightsRef.current = insights;

  const facts = useMemo(() => buildAiFactsPacket(aiContext), [aiContext]);
  const dataHash = useMemo(() => hashAiFactsPacket(facts), [facts]);

  useEffect(() => {
    if (!enabled || !userId || insightsRef.current.length === 0) return;
    if (lastHashRef.current === dataHash) return;
    // Don't hammer OpenAI / the tab while it's in the background or mid-reload.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void (async () => {
        setIsPolishing(true);

        const cached = await readAiInsightCache<ImproveCachePayload>(
          userId,
          'insight_polish',
          dataHash,
        );

        if (cancelled) return;

        if (cached) {
          applyImprove(cached, dataHash);
          lastHashRef.current = dataHash;
          setIsPolishing(false);
          return;
        }

        // Skip network polish if this exact hash already ran this browser session
        // (avoids re-hitting OpenAI on every Vite full reload).
        try {
          if (sessionStorage.getItem(POLISH_SESSION_KEY) === dataHash) {
            lastHashRef.current = dataHash;
            setIsPolishing(false);
            return;
          }
        } catch {
          // ignore
        }

        const result = await invokeImproveInsights(facts);
        if (cancelled) return;

        if (result) {
          const payload: ImproveCachePayload = {
            polished: result.polished,
            candidates: result.candidates,
          };
          applyImprove(payload, dataHash);
          lastHashRef.current = dataHash;
          try {
            sessionStorage.setItem(POLISH_SESSION_KEY, dataHash);
          } catch {
            // ignore
          }
          void writeAiInsightCache(userId, 'insight_polish', dataHash, payload, 7);
          void writeAiInsightCache(
            userId,
            'ai_candidate',
            dataHash,
            { candidates: result.candidates },
            3,
          );
        } else {
          lastHashRef.current = dataHash;
        }
        setIsPolishing(false);
      })();
    }, 1500);

    function applyImprove(payload: ImproveCachePayload, hash: string) {
      const current = insightsRef.current;
      const allowedIds = new Set(
        current.filter((i) => !isAiForbiddenCategory(i.category)).map((i) => i.id),
      );
      const map: Record<string, PolishedInsight> = {};
      for (const p of payload.polished ?? []) {
        if (allowedIds.has(p.id) && p.title?.trim() && p.body?.trim()) {
          map[p.id] = p;
        }
      }
      setPolishMap(map);
      setCandidates(
        (payload.candidates ?? [])
          .filter((c) => c.title?.trim() && c.body?.trim())
          .slice(0, 3)
          .map((c, i) => ({
            ...c,
            id: `ai-noticed-${hash.slice(0, 8)}-${i}`,
          })),
      );
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, userId, dataHash, facts]);

  const polishedInsights = useMemo(() => {
    return insights.map((insight) => {
      if (isAiForbiddenCategory(insight.category)) return insight;
      const polish = polishMap[insight.id];
      if (!polish) return insight;
      return { ...insight, title: polish.title, body: polish.body };
    });
  }, [insights, polishMap]);

  return {
    polishedInsights,
    candidates,
    isPolishing,
    facts,
    dataHash,
  };
}
