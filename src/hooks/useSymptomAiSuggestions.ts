import { useEffect, useState } from 'react';
import { SYMPTOM_CATALOG } from '../data/symptoms';
import {
  invokeSymptomTranslate,
  type SymptomSuggestion,
} from '../hooks/useAiAssistant';

/**
 * When local catalog search is empty/weak, ask the companion to map everyday phrases
 * to catalog keys. Suggestions are filtered to real catalog keys server-side too.
 */
export function useSymptomAiSuggestions(
  query: string,
  catalogHitCount: number,
  enabled: boolean,
) {
  const [suggestions, setSuggestions] = useState<SymptomSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    const weak = trimmed.length >= 3 && catalogHitCount < 2;
    if (!enabled || !weak) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      setIsLoading(true);
      const catalog = SYMPTOM_CATALOG.slice(0, 80).map((s) => ({
        key: s.key,
        label: s.label,
        searchTerms: s.searchTerms.slice(0, 6),
      }));
      void invokeSymptomTranslate(trimmed, catalog).then((result) => {
        if (cancelled) return;
        setSuggestions(result?.suggestions ?? []);
        setIsLoading(false);
      });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, catalogHitCount, enabled]);

  return { suggestions, isLoading };
}
