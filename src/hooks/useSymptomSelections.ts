import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { UserSymptomSelection } from '../types/database';
import { isMRSCanonicalKey } from '../utils/checkinHelpers';

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

      const symptomIds = [
        ...new Set([...newSelections.map((selection) => selection.symptom_id), ...watchSymptoms]),
      ].filter((id) => !isMRSCanonicalKey(id));
      const sanitizedWatchSymptoms = [...new Set(watchSymptoms)].filter(
        (id) => !isMRSCanonicalKey(id),
      );
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
  // whatever the user had just tracked or starred.
  const trackedSymptomIds = useMemo(
    () => selections.map((s) => s.symptom_id).filter((id) => !isMRSCanonicalKey(id)),
    [selections],
  );

  const watchSymptomIds = useMemo(
    () =>
      selections
        .filter((s) => s.is_watch_symptom)
        .map((s) => s.symptom_id)
        .filter((id) => !isMRSCanonicalKey(id)),
    [selections],
  );

  return {
    selections,
    trackedSymptomIds,
    watchSymptomIds,
    isLoading,
    error,
    fetchSelections,
    saveSelections,
  };
}
