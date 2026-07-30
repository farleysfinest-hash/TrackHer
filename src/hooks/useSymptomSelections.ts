import { useCallback, useEffect, useMemo } from 'react';
import {
  useSymptomSelectionsStore,
  type SymptomSelection,
} from '../stores/symptomSelectionsStore';

export type { SymptomSelection };

/**
 * Shared symptom-selection cache — Check-In, Quick Log, and manage modals
 * share one fetch per session.
 */
export function useSymptomSelections() {
  const selections = useSymptomSelectionsStore((s) => s.selections);
  const isLoading = useSymptomSelectionsStore((s) => s.isLoading);
  const error = useSymptomSelectionsStore((s) => s.error);
  const fetchSelections = useSymptomSelectionsStore((s) => s.fetchSelections);
  const saveSelectionsStore = useSymptomSelectionsStore((s) => s.saveSelections);

  useEffect(() => {
    void fetchSelections();
  }, [fetchSelections]);

  const saveSelections = useCallback(
    async (newSelections: SymptomSelection[], watchSymptoms: string[]) =>
      saveSelectionsStore(newSelections, watchSymptoms),
    [saveSelectionsStore],
  );

  // Memoized because SymptomManageModal resets in-progress edits from these
  // arrays — fresh identity each render silently discarded edits.
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
