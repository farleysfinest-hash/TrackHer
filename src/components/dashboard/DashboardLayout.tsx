import { useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useChartData } from '../../hooks/useChartData';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
import { useAuthStore } from '../../stores/authStore';
import { runPatternEngine } from '../../engine/patternEngine';
import { IS_DEV_MODE } from '../../lib/devMode';
import { getDevExtendedSymptomLogs } from '../../lib/devStore';
import type { ExtendedSymptomLog } from '../../types/database';
import { DateRangeSelector } from './DateRangeSelector';
import { WelcomeMessage } from './WelcomeMessage';
import { ScoreSummaryCards } from './ScoreSummaryCards';
import { CheckinPromptWidget } from '../checkin/CheckinPromptWidget';
import { OverlayChart } from './OverlayChart';
import { SubscaleChart } from './SubscaleChart';
import { SymptomHeatmap } from './SymptomHeatmap';
import { LabTrendChart } from './LabTrendChart';
import { getDefaultBiomarkerKey } from './LabTrendSelector';
import { DrillDownControls } from './DrillDownControls';
import { ActiveMedicationsSummary } from './ActiveMedicationsSummary';
import { LabSummaryWidget } from './LabSummaryWidget';
import { ProviderReportButton } from './ProviderReportButton';
import { DashboardInsightsPanel } from '../insights/DashboardInsightsPanel';
import { QuickLogWidget } from './QuickLogWidget';
import { PersonalSymptomTrends } from './PersonalSymptomTrends';

export function DashboardLayout() {
  const dateRange = useDashboardStore((s) => s.dateRange);
  const profile = useAuthStore((s) => s.profile);
  const checkinStatus = useCheckinStatus();
  const {
    getSymptomTrendData,
    getMedicationChangeMarkers,
    getHeatmapData,
    getLabTrendData,
    getDrillDownData,
    checkins,
    allCheckins,
    medications,
    allMedicationChanges,
    labResults,
    allLabResults,
    refreshAll,
  } = useChartData(dateRange);

  const [extendedSymptoms, setExtendedSymptoms] = useState<ExtendedSymptomLog[]>(() =>
    IS_DEV_MODE ? getDevExtendedSymptomLogs() : [],
  );

  useEffect(() => {
    if (IS_DEV_MODE) {
      setExtendedSymptoms(getDevExtendedSymptomLogs());
    }
  }, [allCheckins]);

  const insights = useMemo(() => {
    if (!profile || allCheckins.length === 0) return [];
    return runPatternEngine({
      checkins: allCheckins,
      extendedSymptoms,
      medications,
      medicationChanges: allMedicationChanges,
      labResults: allLabResults,
      profile,
    });
  }, [
    profile,
    allCheckins,
    extendedSymptoms,
    medications,
    allMedicationChanges,
    allLabResults,
  ]);

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-sage-800">Dashboard</h1>
      </div>

      <WelcomeMessage />

      <DateRangeSelector />

      <ScoreSummaryCards checkins={allCheckins} streak={checkinStatus.streak} />

      <QuickLogWidget />

      <CheckinPromptWidget {...checkinStatus} />

      <DashboardInsightsPanel insights={insights} />

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

      <ProviderReportButton />
    </div>
  );
}
