import { useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useChartData } from '../../hooks/useChartData';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
import { useInsights } from '../../hooks/useInsights';
import { useStageProfile } from '../../hooks/useStageProfile';
import { useLocalToday } from '../../hooks/useLocalToday';
import { getStageTrackingPhrase } from '../../engine/stageProfile';
import { getResolvedTimezone } from '../../utils/checkinHelpers';
import { useAuthStore } from '../../stores/authStore';
import { DateRangeSelector } from './DateRangeSelector';
import { ScoreSummaryCards } from './ScoreSummaryCards';
import { WelcomeMessage } from './WelcomeMessage';
import { StoryColumn } from './StoryColumn';
import { SubscaleChart } from './SubscaleChart';
import { SymptomHeatmap } from './SymptomHeatmap';
import { LabTrendChart } from './LabTrendChart';
import { getDefaultBiomarkerKey } from './LabTrendSelector';
import { DrillDownControls } from './DrillDownControls';
import { ActiveMedicationsSummary } from './ActiveMedicationsSummary';
import { LabSummaryWidget } from './LabSummaryWidget';
import { AppointmentCountdownCard } from './AppointmentCountdownCard';
import { daysBetweenISO } from '../../utils/localDate';
import { ProviderReportButton } from './ProviderReportButton';
import { DashboardInsightsPanel } from '../insights/DashboardInsightsPanel';
import { SafeguardingCard } from '../insights/SafeguardingCard';
import { QuickLogWidget } from './QuickLogWidget';
import { RecentLogs } from './RecentLogs';
import { PersonalSymptomTrends } from './PersonalSymptomTrends';
import { StrawStageCard } from './StrawStageCard';
import { UnlockProgress } from './UnlockProgress';
import { FullDashboardUnlockCard } from './FullDashboardUnlockCard';

const FULL_DASHBOARD_CHECKINS = 7;

type DashboardMode = 'full' | 'early';

export function DashboardLayout() {
  const dateRange = useDashboardStore((s) => s.dateRange);
  const refreshDateRange = useDashboardStore((s) => s.refreshDateRange);
  // Kept warm for prompt 3 header subtitle swap (due-state).
  useCheckinStatus();
  const { insights, primaryInsights, moreInsights, safeguardingInsights, dismissInsight, extendedSymptoms } = useInsights();
  const {
    getSymptomTrendData,
    getMedicationChangeMarkers,
    getHeatmapData,
    getLabTrendData,
    getDrillDownData,
    checkins,
    summaryCheckins,
    mrsCheckinCount,
    earliestCheckinDate,
    checkinsLoading,
    medications,
    changes,
    labResults,
    allLabResults,
    refreshAll,
  } = useChartData(dateRange);

  const [biomarkerKey, setBiomarkerKey] = useState('estradiol');
  // Stick the early/full branch after first resolve so date-range refetches
  // don't unmount the page (and reset scroll) while isLoading flips true.
  const [dashboardMode, setDashboardMode] = useState<DashboardMode | null>(null);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const refresh = () => refreshDateRange();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refreshDateRange]);

  useEffect(() => {
    if (labResults.length > 0) {
      setBiomarkerKey(getDefaultBiomarkerKey(labResults));
    }
  }, [labResults]);

  useEffect(() => {
    if (checkinsLoading) return;
    setDashboardMode(mrsCheckinCount >= FULL_DASHBOARD_CHECKINS ? 'full' : 'early');
  }, [checkinsLoading, mrsCheckinCount]);

  const symptomTrend = useMemo(() => getSymptomTrendData(), [getSymptomTrendData]);
  const changeMarkers = useMemo(() => getMedicationChangeMarkers(), [getMedicationChangeMarkers]);
  const heatmapRows = useMemo(() => getHeatmapData(), [getHeatmapData]);
  const labTrend = useMemo(
    () => getLabTrendData(biomarkerKey),
    [getLabTrendData, biomarkerKey],
  );
  const checkinDates = useMemo(
    () => checkins.map((c) => c.checkin_date),
    [checkins],
  );

  const isFullDashboard = dashboardMode === 'full';
  const isEarlyDashboard = dashboardMode === 'early';

  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const stageProfile = useStageProfile();
  const stageTrackingPhrase = getStageTrackingPhrase(stageProfile);
  const today = useLocalToday(timezone);
  const appointmentDate = useAuthStore((s) => s.profile?.next_appointment_date);
  const daysUntilAppointment =
    appointmentDate && appointmentDate >= today
      ? daysBetweenISO(today, appointmentDate)
      : null;
  const showStandaloneReport =
    isFullDashboard && (daysUntilAppointment === null || daysUntilAppointment > 7);

  const safeguardingCards = safeguardingInsights.map((insight) => (
    <SafeguardingCard
      key={insight.id}
      insight={insight}
      onDismiss={dismissInsight}
    />
  ));

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-sage-800">Dashboard</h1>
          <p className="mt-1 text-sage-500">
            {stageTrackingPhrase
              ? `You're tracking through ${stageTrackingPhrase}.`
              : 'Track your symptoms, doses, and patterns over time.'}
          </p>
        </div>
      </div>

      {isFullDashboard ? (
        <>
          {safeguardingCards}

          <QuickLogWidget />

          <FullDashboardUnlockCard />

          <AppointmentCountdownCard earliestCheckinDate={earliestCheckinDate} />

          <DateRangeSelector />

          <ScoreSummaryCards checkins={summaryCheckins} dateRange={dateRange} />

          <RecentLogs />

          <DashboardInsightsPanel
            primaryInsights={primaryInsights}
            moreInsights={moreInsights}
            onDismiss={dismissInsight}
          />

          <StrawStageCard />

          <StoryColumn
            data={symptomTrend}
            medications={medications}
            medicationChanges={changes}
            windowStart={dateRange.start}
            windowEnd={dateRange.end}
            insights={insights}
          />

          <PersonalSymptomTrends checkins={checkins} extendedLogs={extendedSymptoms} />

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <SubscaleChart data={symptomTrend} />
            </div>
            <div className="min-w-0">
              <SymptomHeatmap rows={heatmapRows} />
            </div>
          </div>

          <LabTrendChart
            data={labTrend}
            biomarkerKey={biomarkerKey}
            labResults={labResults}
            onBiomarkerChange={setBiomarkerKey}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ActiveMedicationsSummary medications={medications} />
            <LabSummaryWidget labResults={allLabResults} />
          </div>

          <DrillDownControls
            checkinDates={checkinDates}
            getDrillDownData={getDrillDownData}
            medications={medications}
            changeMarkers={changeMarkers}
          />

          {showStandaloneReport && <ProviderReportButton />}
        </>
      ) : isEarlyDashboard ? (
        <>
          {safeguardingCards}

          <QuickLogWidget />

          <WelcomeMessage />

          <AppointmentCountdownCard earliestCheckinDate={earliestCheckinDate} />

          <UnlockProgress checkinCount={mrsCheckinCount} />

          <RecentLogs />

          {(primaryInsights.length > 0 || moreInsights.length > 0) && (
            <DashboardInsightsPanel
              primaryInsights={primaryInsights}
              moreInsights={moreInsights}
              onDismiss={dismissInsight}
            />
          )}

          <StrawStageCard />

          <ActiveMedicationsSummary medications={medications} />
        </>
      ) : null}
    </div>
  );
}
