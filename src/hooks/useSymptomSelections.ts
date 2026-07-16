import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { UserSymptomSelection } from '../types/database';
import { isMRSCanonicalKey } from '../utils/checkinHelpers';

export interface SymptomSelection {
  symptom_id: string;
  is_watch_symptom: boolean;
}

export function useSymptomSelections() {
  const [selections, setSelections] = useState<SymptomSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      return true;
    },
    [fetchSelections],
  );

  const trackedSymptomIds = selections
    .map((s) => s.symptom_id)
    .filter((id) => !isMRSCanonicalKey(id));

  const watchSymptomIds = selections
    .filter((s) => s.is_watch_symptom)
    .map((s) => s.symptom_id)
    .filter((id) => !isMRSCanonicalKey(id));

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
