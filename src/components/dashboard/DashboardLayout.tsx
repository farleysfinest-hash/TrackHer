import { useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useChartData } from '../../hooks/useChartData';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
import { useInsights } from '../../hooks/useInsights';
import { useStageProfile } from '../../hooks/useStageProfile';
import { getStageTrackingPhrase } from '../../engine/stageProfile';
import { hasMRSData, getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { useAuthStore } from '../../stores/authStore';
import { DateRangeSelector } from './DateRangeSelector';
import { ScoreSummaryCards } from './ScoreSummaryCards';
import { WelcomeMessage } from './WelcomeMessage';
import { CheckinPromptWidget } from '../checkin/CheckinPromptWidget';
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
import { DoseTapWidget } from './DoseTapWidget';
import { ExperimentWindowCard } from './ExperimentWindowCard';
import { PersonalSymptomTrends } from './PersonalSymptomTrends';
import { StrawStageCard } from './StrawStageCard';
import { UnlockProgress } from './UnlockProgress';
import { FullDashboardUnlockCard } from './FullDashboardUnlockCard';

const FULL_DASHBOARD_CHECKINS = 7;

export function DashboardLayout() {
  const dateRange = useDashboardStore((s) => s.dateRange);
  const checkinStatus = useCheckinStatus();
  const { insights, primaryInsights, moreInsights, safeguardingInsights, dismissInsight, extendedSymptoms } = useInsights();
  const {
    getSymptomTrendData,
    getMedicationChangeMarkers,
    getHeatmapData,
    getLabTrendData,
    getDrillDownData,
    checkins,
    allCheckins,
    medications,
    changes,
    labResults,
    allLabResults,
    refreshAll,
  } = useChartData(dateRange);

  const [biomarkerKey, setBiomarkerKey] = useState('estradiol');

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (labResults.length > 0) {
      setBiomarkerKey(getDefaultBiomarkerKey(labResults));
    }
  }, [labResults]);

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

  const mrsCheckinCount = useMemo(
    () => allCheckins.filter(hasMRSData).length,
    [allCheckins],
  );
  const isFullDashboard = mrsCheckinCount >= FULL_DASHBOARD_CHECKINS;

  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const stageProfile = useStageProfile();
  const stageTrackingPhrase = getStageTrackingPhrase(stageProfile);
  const today = getLocalDateISO(timezone);
  const appointmentDate = useAuthStore((s) => s.profile?.next_appointment_date);
  const daysUntilAppointment =
    appointmentDate && appointmentDate >= today
      ? Math.floor(
          (new Date(appointmentDate + 'T12:00:00').getTime() -
            new Date(today + 'T12:00:00').getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;
  const showStandaloneReport =
    isFullDashboard && (daysUntilAppointment === null || daysUntilAppointment > 7);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
          <FullDashboardUnlockCard />

          <DateRangeSelector />

          <ScoreSummaryCards checkins={allCheckins} />

          <StrawStageCard />

          <DoseTapWidget />

          <QuickLogWidget />

          <CheckinPromptWidget {...checkinStatus} />

          <ExperimentWindowCard
            insights={insights}
            hasCheckedInToday={checkinStatus.hasCheckedInToday}
          />

          <AppointmentCountdownCard checkins={allCheckins} />

          {safeguardingInsights.map((insight) => (
            <SafeguardingCard
              key={insight.id}
              insight={insight}
              onDismiss={dismissInsight}
            />
          ))}

          <DashboardInsightsPanel
            primaryInsights={primaryInsights}
            moreInsights={moreInsights}
            onDismiss={dismissInsight}
          />

          <StoryColumn
            data={symptomTrend}
            medications={medications}
            medicationChanges={changes}
            windowStart={dateRange.start}
            windowEnd={dateRange.end}
            insights={insights}
          />

          <PersonalSymptomTrends checkins={checkins} extendedLogs={extendedSymptoms} />

          <div className="grid gap-6 lg:grid-cols-2">
            <SubscaleChart data={symptomTrend} />
            <SymptomHeatmap rows={heatmapRows} />
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
      ) : (
        <>
          <WelcomeMessage />

          <CheckinPromptWidget {...checkinStatus} />

          <ExperimentWindowCard
            insights={insights}
            hasCheckedInToday={checkinStatus.hasCheckedInToday}
          />

          <AppointmentCountdownCard checkins={allCheckins} />

          {safeguardingInsights.map((insight) => (
            <SafeguardingCard
              key={insight.id}
              insight={insight}
              onDismiss={dismissInsight}
            />
          ))}

          <StrawStageCard />

          <DoseTapWidget />

          <QuickLogWidget />

          <UnlockProgress checkinCount={mrsCheckinCount} />

          {(primaryInsights.length > 0 || moreInsights.length > 0) && (
            <DashboardInsightsPanel
              primaryInsights={primaryInsights}
              moreInsights={moreInsights}
              onDismiss={dismissInsight}
            />
          )}

          <ActiveMedicationsSummary medications={medications} />
        </>
      )}
    </div>
  );
}
