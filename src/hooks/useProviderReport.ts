import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCheckins } from './useCheckins';
import { useMedications } from './useMedications';
import { useMedicationChanges } from './useMedicationChanges';
import { useLabResults } from './useLabResults';
import { useQuickLog } from './useQuickLog';
import { generateProviderReport } from '../utils/pdfReport';
import { formatChartDateLong } from '../utils/chartHelpers';
import { IS_DEV_MODE } from '../lib/devMode';
import {
  getDevCheckins,
  getDevMedications,
  getDevMedicationChanges,
  getDevLabResults,
  getDevExtendedSymptomLogs,
  getDevQuickLogs,
  getDevSymptomSelections,
} from '../lib/devStore';
import { supabase } from '../lib/supabase';
import type { ExtendedSymptomLog } from '../types/database';
import type { DateRange } from '../stores/dashboardStore';

export function useProviderReport() {
  const profile = useAuthStore((s) => s.profile);
  const { checkins, fetchCheckins } = useCheckins();
  const { medications, fetchMedications } = useMedications();
  const { changes, fetchChanges } = useMedicationChanges();
  const { labResults, fetchLabResults } = useLabResults();
  const { events: quickLogEvents, fetchEvents } = useQuickLog();
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
          fetchEvents(500),
        ]);

        let extendedSymptomLogs: ExtendedSymptomLog[] = [];
        let trackedSymptomIds: string[] = [];
        let watchSymptomIds: string[] = [];

        if (IS_DEV_MODE) {
          extendedSymptomLogs = getDevExtendedSymptomLogs();
          const selections = getDevSymptomSelections();
          trackedSymptomIds = selections.map((s) => s.symptom_id);
          watchSymptomIds = selections.filter((s) => s.is_watch_symptom).map((s) => s.symptom_id);
        } else {
          const userId = useAuthStore.getState().user?.id;
          if (userId) {
            const [extResult, selResult] = await Promise.all([
              supabase.from('extended_symptom_logs').select('*').eq('user_id', userId),
              supabase
                .from('user_symptom_selections')
                .select('symptom_id, is_watch_symptom')
                .eq('user_id', userId),
            ]);
            extendedSymptomLogs = (extResult.data as ExtendedSymptomLog[]) ?? [];
            const selections = selResult.data ?? [];
            trackedSymptomIds = selections.map((s) => s.symptom_id);
            watchSymptomIds = selections
              .filter((s) => s.is_watch_symptom)
              .map((s) => s.symptom_id);
          }
        }

        const reportCheckins = IS_DEV_MODE ? getDevCheckins() : checkins;
        const reportMeds = IS_DEV_MODE ? getDevMedications() : medications;
        const reportChanges = IS_DEV_MODE ? getDevMedicationChanges() : changes;
        const reportLabs = IS_DEV_MODE ? getDevLabResults() : labResults;
        const reportQuickLogs = IS_DEV_MODE ? getDevQuickLogs() : quickLogEvents;

        const blob = await generateProviderReport({
          profile,
          medications: reportMeds,
          medicationChanges: reportChanges,
          checkins: reportCheckins,
          labResults: reportLabs,
          extendedSymptomLogs,
          quickLogEvents: reportQuickLogs,
          trackedSymptomIds,
          watchSymptomIds,
          dateRange,
        });

        const today = formatChartDateLong(new Date().toISOString().split('T')[0]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PredictHer-Report-${today.replace(/,/g, '').replace(/ /g, '-')}.pdf`;
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
      quickLogEvents,
      fetchCheckins,
      fetchMedications,
      fetchChanges,
      fetchLabResults,
      fetchEvents,
    ],
  );

  return { generateReport, isGenerating, error };
}
