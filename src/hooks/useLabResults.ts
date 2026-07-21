import { useLabResultsStore } from '../stores/labResultsStore';

export type { LabResultInput } from '../stores/labResultsStore';

/**
 * Lab results are shared across the labs page, charts, and insights — state
 * lives in `useLabResultsStore` so it's fetched once per session, not once per consumer.
 */
export function useLabResults() {
  const labResults = useLabResultsStore((s) => s.labResults);
  const isLoading = useLabResultsStore((s) => s.isLoading);
  const error = useLabResultsStore((s) => s.error);
  const fetchLabResults = useLabResultsStore((s) => s.fetchLabResults);
  const fetchLabDetail = useLabResultsStore((s) => s.fetchLabDetail);
  const getMostRecentLab = useLabResultsStore((s) => s.getMostRecentLab);
  const createLabResult = useLabResultsStore((s) => s.createLabResult);
  const updateLabResult = useLabResultsStore((s) => s.updateLabResult);
  const deleteLabResult = useLabResultsStore((s) => s.deleteLabResult);
  const getPreviousValue = useLabResultsStore((s) => s.getPreviousValue);

  return {
    labResults,
    isLoading,
    error,
    fetchLabResults,
    fetchLabDetail,
    getMostRecentLab,
    createLabResult,
    updateLabResult,
    deleteLabResult,
    getPreviousValue,
  };
}
