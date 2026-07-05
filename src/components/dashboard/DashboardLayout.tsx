import { useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useChartData } from '../../hooks/useChartData';
import { useCheckinStatus } from '../../hooks/useCheckinStatus';
import { DateRangeSelector } from './DateRangeSelector';
import { ScoreSummaryCards } from './ScoreSummaryCards';
import { CheckinPromptWidget } from '../checkin/CheckinPromptWidget';
import { OverlayChart } from './OverlayChart';
import { SubscaleChart } from './SubscaleChart';
import { SymptomHeatmap } from './SymptomHeatmap';
import { LabTrendChart } from './LabTrendChart';
import { LabTrendSelector, getDefaultBiomarkerKey } from './LabTrendSelector';
import { DrillDownControls } from './DrillDownControls';
import { ActiveMedicationsSummary } from './ActiveMedicationsSummary';
import { LabSummaryWidget } from './LabSummaryWidget';
import { ProviderReportButton } from './ProviderReportButton';

export function DashboardLayout() {
  const dateRange = useDashboardStore((s) => s.dateRange);
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-sage-800">Dashboard</h1>
      </div>

      <DateRangeSelector />

      <ScoreSummaryCards checkins={allCheckins} streak={checkinStatus.streak} />

      <CheckinPromptWidget {...checkinStatus} />

      <OverlayChart data={symptomTrend} changeMarkers={changeMarkers} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SubscaleChart data={symptomTrend} />
        <SymptomHeatmap rows={heatmapRows} />
      </div>

      <LabTrendSelector
        labResults={labResults}
        selectedKey={biomarkerKey}
        onChange={setBiomarkerKey}
      />
      <LabTrendChart data={labTrend} biomarkerKey={biomarkerKey} />

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
