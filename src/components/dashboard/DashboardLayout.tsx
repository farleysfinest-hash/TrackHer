import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useChartData } from '../../hooks/useChartData';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
import { useInsights } from '../../hooks/useInsights';
import { useStageProfile } from '../../hooks/useStageProfile';
import { getStageTrackingPhrase } from '../../engine/stageProfile';
import { refreshCheckinStatusForCurrentUser } from '../../stores/checkinStatusStore';
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
import { ProviderReportButton } from './ProviderReportButton';
import { DashboardInsightsPanel } from '../insights/DashboardInsightsPanel';
import { SafeguardingCard } from '../insights/SafeguardingCard';
import { QuickLogWidget } from './QuickLogWidget';
import { PersonalSymptomTrends } from './PersonalSymptomTrends';
import { StrawStageCard } from './StrawStageCard';
import { UnlockProgress } from './UnlockProgress';
import { GhostChartFrame } from './GhostChartFrame';
import { PullToRefresh } from '../ui/PullToRefresh';
import { useQuickLogStore } from '../../stores/quickLogStore';

const FULL_DASHBOARD_CHECKINS = 7;

type DashboardMode = 'full' | 'early';

export function DashboardLayout() {
  const { pathname } = useLocation();
  const quickLogOpen = useQuickLogStore((s) => s.isSheetOpen);
  const dateRange = useDashboardStore((s) => s.dateRange);
  const refreshDateRange = useDashboardStore((s) => s.refreshDateRange);
  const checkinStatus = useCheckinStatus();
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

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([refreshAll(), refreshCheckinStatusForCurrentUser()]);
  }, [refreshAll]);

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

  const stageProfile = useStageProfile();
  const stageTrackingPhrase = getStageTrackingPhrase(stageProfile);

  // Same gate WeeklyCheckinPromptCard uses for the owed/open CTA path:
  // isDue is false once hasFullMrsToday or weeklyMinimumMet.
  const weeklyCheckinOpen = checkinStatus.isDue;
  const subtitle = weeklyCheckinOpen
    ? 'Your weekly check-in is open — takes about 2 minutes.'
    : stageTrackingPhrase
      ? `You're tracking through ${stageTrackingPhrase}.`
      : 'Track your symptoms, doses, and patterns over time.';

  const safeguardingCards = safeguardingInsights.map((insight) => (
    <SafeguardingCard
      key={insight.id}
      insight={insight}
      onDismiss={dismissInsight}
    />
  ));

  return (
    <PullToRefresh
      enabled={pathname === '/dashboard' && !quickLogOpen}
      onRefresh={handlePullRefresh}
    >
    <div className="mx-auto min-w-0 max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-sage-800">Dashboard</h1>
          <p className="mt-1 text-sage-500">{subtitle}</p>
        </div>
      </div>

      {isFullDashboard ? (
        <>
          {safeguardingCards}

          <QuickLogWidget />

          <UnlockProgress checkinCount={mrsCheckinCount} />

          <ScoreSummaryCards checkins={summaryCheckins} dateRange={dateRange} />

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
              <SubscaleChart data={symptomTrend} changes={changes} />
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

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AppointmentCountdownCard earliestCheckinDate={earliestCheckinDate} />
            <ProviderReportButton />
          </div>
        </>
      ) : isEarlyDashboard ? (
        <>
          {safeguardingCards}

          <QuickLogWidget />

          <UnlockProgress checkinCount={mrsCheckinCount} />

          <WelcomeMessage />

          {mrsCheckinCount === 0 ? (
            <>
              <GhostChartFrame
                title="Symptom story"
                caption={`Your symptom story unlocks after ${FULL_DASHBOARD_CHECKINS} weekly check-ins · ${mrsCheckinCount} done`}
              />
              <GhostChartFrame
                title="Symptom domains"
                caption={`Your symptom domains unlock after ${FULL_DASHBOARD_CHECKINS} weekly check-ins · ${mrsCheckinCount} done`}
              />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <StoryColumn
                  data={symptomTrend}
                  medications={medications}
                  medicationChanges={changes}
                  windowStart={dateRange.start}
                  windowEnd={dateRange.end}
                  insights={insights}
                />
                <p className="text-sm text-sage-500">
                  More check-ins will sharpen this — {mrsCheckinCount} of {FULL_DASHBOARD_CHECKINS}.
                </p>
              </div>
              <div className="space-y-2">
                <SubscaleChart data={symptomTrend} changes={changes} />
                <p className="text-sm text-sage-500">
                  More check-ins will sharpen this — {mrsCheckinCount} of {FULL_DASHBOARD_CHECKINS}.
                </p>
              </div>
            </>
          )}

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
    </PullToRefresh>
  );
}
