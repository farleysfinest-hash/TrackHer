import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCheckins } from './useCheckins';
import { useMedications } from './useMedications';
import { useMedicationChanges } from './useMedicationChanges';
import { useLabResults } from './useLabResults';
import { generateProviderReport } from '../utils/pdfReport';
import { formatChartDateLong } from '../utils/chartHelpers';
import { IS_DEV_MODE } from '../lib/devMode';
import {
  getDevCheckins,
  getDevMedications,
  getDevMedicationChanges,
  getDevLabResults,
} from '../lib/devStore';
import type { DateRange } from '../stores/dashboardStore';

export function useProviderReport() {
  const profile = useAuthStore((s) => s.profile);
  const { checkins, fetchCheckins } = useCheckins();
  const { medications, fetchMedications } = useMedications();
  const { changes, fetchChanges } = useMedicationChanges();
  const { labResults, fetchLabResults } = useLabResults();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(
    async (dateRange: DateRange) => {
      if (!profile) {
        setError('Profile not loaded');
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        await Promise.all([
          fetchCheckins(200),
          fetchMedications(),
          fetchChanges(),
          fetchLabResults(),
        ]);

        const reportCheckins = IS_DEV_MODE ? getDevCheckins() : checkins;
        const reportMeds = IS_DEV_MODE ? getDevMedications() : medications;
        const reportChanges = IS_DEV_MODE ? getDevMedicationChanges() : changes;
        const reportLabs = IS_DEV_MODE ? getDevLabResults() : labResults;

        const blob = await generateProviderReport({
          profile,
          medications: reportMeds,
          medicationChanges: reportChanges,
          checkins: reportCheckins,
          labResults: reportLabs,
          dateRange,
        });

        const today = formatChartDateLong(new Date().toISOString().split('T')[0]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TrackHer-Report-${today.replace(/,/g, '').replace(/ /g, '-')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate report');
      } finally {
        setIsGenerating(false);
      }
    },
    [
      profile,
      checkins,
      medications,
      changes,
      labResults,
      fetchCheckins,
      fetchMedications,
      fetchChanges,
      fetchLabResults,
    ],
  );

  return { generateReport, isGenerating, error };
}
