import { useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  createFreshProviderReportBlob,
  ProviderReportDataLoadError,
  PROVIDER_REPORT_LOAD_ERROR_MESSAGE,
} from './providerReportData';
import { formatChartDateLong } from '../utils/chartHelpers';
import { getResolvedTimezone } from '../utils/checkinHelpers';
import { todayISO } from '../utils/localDate';
import type { DateRange } from '../stores/dashboardStore';

export function useProviderReport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (dateRange: DateRange, includeSafeguarding = false) => {
    const { user, profile } = useAuthStore.getState();

    if (!user?.id) {
      setError('You must be signed in to generate a provider report.');
      return;
    }

    if (!profile) {
      setError('Profile not loaded');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const timezone = getResolvedTimezone(profile.timezone);

      const blob = await createFreshProviderReportBlob({
        userId: user.id,
        profile,
        dateRange,
        timezone,
        includeSafeguarding,
      });

      const today = formatChartDateLong(todayISO(timezone));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TrackHer-Report-${today.replace(/,/g, '').replace(/ /g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ProviderReportDataLoadError) {
        setError(PROVIDER_REPORT_LOAD_ERROR_MESSAGE);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate report');
      }
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateReport, isGenerating, error };
}
