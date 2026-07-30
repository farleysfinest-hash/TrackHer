import { useCallback, useState } from 'react';
import { SYMPTOM_CATALOG } from '../data/symptoms';
import { invokeJournalExtract } from './useAiAssistant';
import {
  clampJournalExtract,
  type JournalExtractResult,
} from '../utils/aiJournalExtract';

/**
 * One-shot journal → structured suggestions. Caller confirms before any writes.
 */
export function useJournalExtract() {
  const [result, setResult] = useState<JournalExtractResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(async (freeText: string, medicationNames: string[]) => {
    const trimmed = freeText.trim();
    if (!trimmed) {
      setError('Write a little about today first.');
      return null;
    }
    setIsLoading(true);
    setError(null);
    const catalog = SYMPTOM_CATALOG.slice(0, 80).map((s) => ({
      key: s.key,
      label: s.label,
      searchTerms: (s.searchTerms ?? []).slice(0, 6),
    }));
    const allowed = new Map(catalog.map((c) => [c.key, c.label]));
    const medSet = new Set(medicationNames);
    const raw = await invokeJournalExtract(trimmed, catalog, medicationNames);
    setIsLoading(false);
    if (!raw) {
      setError('Could not read that just now — try again in a moment.');
      setResult(null);
      return null;
    }
    const clamped = clampJournalExtract(raw, allowed, medSet);
    setResult(clamped);
    if (clamped.risk && clamped.riskReply) {
      setError(null);
      return clamped;
    }
    if (clamped.symptoms.length === 0 && clamped.events.length === 0) {
      setError('Nothing clear to log from that — try naming a symptom or med.');
    }
    return clamped;
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, extract, clear, setResult };
}
