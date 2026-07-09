import { useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useChartData } from '../../hooks/useChartData';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
import { useInsights } from '../../hooks/useInsights';
import { hasMRSData, getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { useAuthStore } from '../../stores/authStore';
import { DateRangeSelector } from './DateRangeSelector';
import { ScoreSummaryCards } from './ScoreSummaryCards';
import { WelcomeMessage } from './WelcomeMessage';
import { CheckinPromptWidget } from '../checkin/CheckinPromptWidget';
import { OverlayChart } from './OverlayChart';
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
  const { insights, dismissInsight, extendedSymptoms } = useInsights();
  const {
    getSymptomTrendData,
    getMedicationChangeMarkers,
    getHeatmapData,
    getLabTrendData,
    getDrillDownData,
    checkins,
    allCheckins,
    medications,
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
        <h1 className="font-display text-3xl text-sage-800">Dashboard</h1>
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

          <DashboardInsightsPanel insights={insights} onDismiss={dismissInsight} />

          <OverlayChart data={symptomTrend} changeMarkers={changeMarkers} />

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

          <StrawStageCard />

          <DoseTapWidget />

          <QuickLogWidget />

          <UnlockProgress checkinCount={mrsCheckinCount} />

          {insights.length > 0 && (
            <DashboardInsightsPanel insights={insights} onDismiss={dismissInsight} />
          )}

          <ActiveMedicationsSummary medications={medications} />
        </>
      )}
    </div>
  );
}
