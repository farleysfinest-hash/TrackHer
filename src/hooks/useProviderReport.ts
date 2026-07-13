import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCheckins } from './useCheckins';
import { useMedications } from './useMedications';
import { useMedicationChanges } from './useMedicationChanges';
import { useLabResults } from './useLabResults';
import { useQuickLog } from './useQuickLog';
import { generateProviderReport } from '../utils/pdfReport';
import { formatChartDateLong } from '../utils/chartHelpers';
import { getResolvedTimezone } from '../utils/checkinHelpers';
import { todayISO } from '../utils/localDate';
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
    async (dateRange: DateRange, includeSafeguarding = false) => {
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

        const timezone = getResolvedTimezone(profile.timezone);

        const blob = await generateProviderReport({
          profile,
          medications,
          medicationChanges: changes,
          checkins,
          labResults,
          extendedSymptomLogs,
          quickLogEvents,
          trackedSymptomIds,
          watchSymptomIds,
          dateRange,
          timezone,
          includeSafeguarding,
        });

        const today = formatChartDateLong(todayISO());
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
