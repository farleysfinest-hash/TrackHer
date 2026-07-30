import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { UserSymptomSelection } from '../types/database';

export interface SymptomSelection {
  symptom_id: string;
  is_watch_symptom: boolean;
}

const SELECTIONS_UPDATED_EVENT = 'trackher:symptom-selections-updated';

export function useSymptomSelections() {
  const [selections, setSelections] = useState<SymptomSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const instanceIdRef = useRef(Symbol('symptom-selections'));

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchSelections = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      setSelections([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('user_symptom_selections')
      .select('symptom_id, is_watch_symptom')
      .eq('user_id', userId);

    setIsLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setSelections((data as Pick<UserSymptomSelection, 'symptom_id' | 'is_watch_symptom'>[]) ?? []);
  }, []);

  useEffect(() => {
    void fetchSelections();
  }, [fetchSelections]);

  useEffect(() => {
    const handleSelectionsUpdated = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        event.detail === instanceIdRef.current
      ) {
        return;
      }
      void fetchSelections();
    };
    window.addEventListener(SELECTIONS_UPDATED_EVENT, handleSelectionsUpdated);
    return () => window.removeEventListener(SELECTIONS_UPDATED_EVENT, handleSelectionsUpdated);
  }, [fetchSelections]);

  const saveSelections = useCallback(
    async (
      newSelections: SymptomSelection[],
      watchSymptoms: string[],
    ): Promise<boolean> => {
      const userId = getUserId();
      if (!userId) return false;

      // Tracked set is the Quick Log set. Watch ids mirror tracked for back-compat
      // with is_watch_symptom column (callers may still pass a subset).
      const symptomIds = [
        ...new Set([...newSelections.map((selection) => selection.symptom_id), ...watchSymptoms]),
      ];
      const sanitizedWatchSymptoms = [
        ...new Set(watchSymptoms.length > 0 ? watchSymptoms : symptomIds),
      ].filter((id) => symptomIds.includes(id));

      const { error: saveError } = await supabase.rpc('save_user_symptom_selections', {
        p_symptom_ids: symptomIds,
        p_watch_symptom_ids: sanitizedWatchSymptoms,
      });

      if (saveError) {
        setError(saveError.message);
        return false;
      }

      await fetchSelections();
      window.dispatchEvent(
        new CustomEvent(SELECTIONS_UPDATED_EVENT, { detail: instanceIdRef.current }),
      );
      return true;
    },
    [fetchSelections],
  );

  // Memoized because SymptomManageModal resets its in-progress edits from these
  // arrays. Rebuilding them on every render of a consumer gave them a fresh
  // identity each time, which re-fired that reset and silently discarded
  // whatever the user had just tracked.
  const trackedSymptomIds = useMemo(
    () => selections.map((s) => s.symptom_id),
    [selections],
  );

  return {
    selections,
    trackedSymptomIds,
    isLoading,
    error,
    fetchSelections,
    saveSelections,
  };
}
