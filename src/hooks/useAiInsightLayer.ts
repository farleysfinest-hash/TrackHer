import { useEffect, useMemo, useRef, useState } from 'react';
import type { Insight } from '../engine/types';
import { useAuthStore } from '../stores/authStore';
import {
  buildAiFactsPacket,
  type AiFactsPacketInput,
} from '../utils/aiFactsPacket';
import {
  hashAiFactsPacket,
  readAiInsightCache,
  writeAiInsightCache,
} from '../utils/aiInsightsCache';
import {
  invokeImproveInsights,
  type AiCandidate,
} from './useAiAssistant';
import { logAiCandidateEvent } from '../utils/aiCandidateEventLog';
import {
  hashLunaMemories,
  listLunaMemories,
  onLunaMemoryChanged,
} from '../lib/lunaConversations';

export interface LunaSynthesisCandidate extends AiCandidate {
  id: string;
}

/** @deprecated Use LunaSynthesisCandidate. */
export type AiNoticedCandidate = LunaSynthesisCandidate;

interface ImproveCachePayload {
  candidates: AiCandidate[];
  insufficient?: { title: string; body: string } | null;
  monitorNote?: { note?: string; gapHint?: string | null } | null;
}

const SYNTHESIS_SESSION_PREFIX = 'trackher_luna_synthesis_hash:';
const SHOWN_SESSION_PREFIX = 'trackher_ai_candidate_shown:';

/**
 * Cached Luna synthesis over deterministic server-side analysis tools.
 * Engine copy remains untouched and authoritative.
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
  const [candidates, setCandidates] = useState<LunaSynthesisCandidate[]>([]);
  const [insufficient, setInsufficient] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [monitorNote, setMonitorNote] = useState<{
    note?: string;
    gapHint?: string | null;
  } | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [memoryHash, setMemoryHash] = useState<string | null>(null);
  const [stateOwnerUserId, setStateOwnerUserId] = useState<string | null>(null);
  const lastHashRef = useRef<string | null>(null);

  const facts = useMemo(() => buildAiFactsPacket(aiContext), [aiContext]);
  const dataHash = useMemo(() => hashAiFactsPacket(facts), [facts]);
  const synthesisHash = memoryHash === null
    ? null
    : `c3-evidence-v1-${dataHash}-${memoryHash}`;

  useEffect(() => {
    lastHashRef.current = null;
    setCandidates([]);
    setInsufficient(null);
    setMonitorNote(null);
    setIsSynthesizing(false);
    setStateOwnerUserId(null);
    if (!userId) {
      setMemoryHash(null);
      return;
    }
    let cancelled = false;
    const refreshMemoryHash = () => {
      void listLunaMemories(userId).then((rows) => {
        if (!cancelled) setMemoryHash(hashLunaMemories(rows));
      }).catch(() => {
        if (!cancelled) setMemoryHash('unavailable');
      });
    };
    refreshMemoryHash();
    const unsubscribe = onLunaMemoryChanged(refreshMemoryHash);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId || synthesisHash === null) {
      setIsSynthesizing(false);
      return;
    }
    const scopedHash = `${userId}:${synthesisHash}`;
    const synthesisSessionKey = `${SYNTHESIS_SESSION_PREFIX}${userId}`;
    if (facts.mrs.length === 0 && facts.pulseRecent.daysSampled === 0) return;
    if (lastHashRef.current === scopedHash) return;
    // Don't hammer OpenAI / the tab while it's in the background or mid-reload.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void (async () => {
        setIsSynthesizing(true);

        const cached = await readAiInsightCache<ImproveCachePayload>(
          userId,
          'luna_synthesis',
          synthesisHash,
        );

        if (cancelled) return;

        if (cached) {
          applyImprove(cached, userId);
          lastHashRef.current = scopedHash;
          setIsSynthesizing(false);
          return;
        }

        // Skip network synthesis if this exact hash already ran this browser session
        // (avoids re-hitting OpenAI on every Vite full reload).
        try {
          if (sessionStorage.getItem(synthesisSessionKey) === synthesisHash) {
            lastHashRef.current = scopedHash;
            setIsSynthesizing(false);
            return;
          }
        } catch {
          // ignore
        }

        const result = await invokeImproveInsights(facts, synthesisHash);
        if (cancelled) return;

        if (result) {
          const payload: ImproveCachePayload = {
            candidates: result.candidates,
            insufficient: result.insufficient ?? null,
            monitorNote: result.monitorNote ?? null,
          };
          applyImprove(payload, userId);
          lastHashRef.current = scopedHash;
          try {
            sessionStorage.setItem(synthesisSessionKey, synthesisHash);
          } catch {
            // ignore
          }
          void writeAiInsightCache(userId, 'luna_synthesis', synthesisHash, payload, 7);
        } else {
          lastHashRef.current = scopedHash;
        }
        setIsSynthesizing(false);
      })();
    }, 1500);

    function applyImprove(payload: ImproveCachePayload, uid: string) {
      const next = (payload.candidates ?? [])
        .filter((c) => c.candidateKey?.trim() && c.title?.trim() && c.body?.trim())
        .slice(0, 3)
        .map((c) => ({
          ...c,
          id: c.candidateKey,
        }));
      setCandidates(next);
      setInsufficient(payload.insufficient ?? null);
      setMonitorNote(payload.monitorNote ?? null);
      setStateOwnerUserId(uid);

      // Log "shown" once per title per browser session.
      for (const c of next) {
        try {
          const key = `${SHOWN_SESSION_PREFIX}${uid}:${c.id}`;
          if (sessionStorage.getItem(key) === '1') continue;
          sessionStorage.setItem(key, '1');
          logAiCandidateEvent(uid, c.title, 'shown');
        } catch {
          logAiCandidateEvent(uid, c.title, 'shown');
        }
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, userId, synthesisHash, facts]);

  const polishedInsights = insights;

  const dismissCandidate = (id: string) => {
    setCandidates((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target && userId) logAiCandidateEvent(userId, target.title, 'dismissed');
      return prev.filter((c) => c.id !== id);
    });
  };

  return {
    polishedInsights,
    candidates: enabled && stateOwnerUserId === userId ? candidates : [],
    insufficient: enabled && stateOwnerUserId === userId ? insufficient : null,
    monitorNote: enabled && stateOwnerUserId === userId ? monitorNote : null,
    isPolishing: isSynthesizing,
    isSynthesizing,
    facts,
    dataHash,
    dismissCandidate,
  };
}
