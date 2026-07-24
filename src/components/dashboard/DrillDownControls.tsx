import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChartCard } from '../ui/ChartCard';
import { MRS_CORE_SYMPTOMS, getSymptomChipLabel } from '../../data/symptoms';
import { formatChartDate } from '../../utils/chartHelpers';
import { buildDailyIndexedWeeklyChart, weeklyChartWindow } from '../../utils/weeklyChartSeries';
import {
  buildMedicationLaneRows,
  doseChangeMarkerPercents,
} from '../../utils/medicationLaneHelpers';
import { ChartReadoutDock } from './ChartReadoutDock';
import {
  BAND_CHART_MARGIN,
  BandPointReadout,
  BandXAxis,
  SymptomBand,
  type BandTooltipSeries,
  type SymptomBandRow,
} from './SymptomBand';
import { MedicationLane } from './MedicationLane';
import type { ChangeMarker } from '../../hooks/useChartData';
import type { Medication } from '../../types/database';

interface DrillDownControlsProps {
  checkinDates: string[];
  getDrillDownData: (
    symptomKeys: string[],
    medicationIds: string[],
  ) => {
    symptomLines: Array<{
      key: string;
      label: string;
      points: Array<{ date: string; dateLabel: string; value: number | null }>;
    }>;
  };
  medications: Medication[];
  changeMarkers: ChangeMarker[];
}

const MAX_SYMPTOMS = 3;
const MAX_MEDS = 3;
const DOMAIN_MAX = 4;

function CompareBody({
  interactive,
  dailyRows,
  segmentKeysByLine,
  symptomLines,
  tooltipSeries,
  laneRows,
  markerLines,
}: {
  interactive: boolean;
  dailyRows: SymptomBandRow[];
  segmentKeysByLine: Record<string, string[]>;
  symptomLines: Array<{ key: string; label: string }>;
  tooltipSeries: BandTooltipSeries[];
  laneRows: ReturnType<typeof buildMedicationLaneRows>;
  markerLines: ReturnType<typeof doseChangeMarkerPercents>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!interactive) setSelectedDate(null);
  }, [interactive]);

  const selectedPoint = useMemo(
    () => (selectedDate ? dailyRows.find((row) => row.date === selectedDate) ?? null : null),
    [dailyRows, selectedDate],
  );

  const plot = (
    <div className="space-y-0">
      {symptomLines.map((line) => (
        <SymptomBand
          key={line.key}
          name={line.label}
          dataKey={line.key}
          data={dailyRows}
          segmentKeys={segmentKeysByLine[line.key] ?? []}
          domainMax={DOMAIN_MAX}
          tooltipMode="severity"
          markers={markerLines}
          interactive={interactive}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ))}

      {laneRows.length > 0 && (
        <div
          style={{
            marginLeft: BAND_CHART_MARGIN.left,
            marginRight: BAND_CHART_MARGIN.right,
          }}
        >
          <MedicationLane rows={laneRows} markers={markerLines} />
        </div>
      )}

      <BandXAxis data={dailyRows} />
    </div>
  );

  if (!interactive) return plot;

  const readout = selectedPoint
    ? BandPointReadout({
        point: selectedPoint,
        tooltipSeries,
        tooltipMode: 'severity',
      })
    : null;

  return <ChartReadoutDock plot={plot} readout={readout} />;
}

export function DrillDownControls({
  checkinDates,
  getDrillDownData,
  medications,
  changeMarkers,
}: DrillDownControlsProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['hot_flashes', 'sleep_problems']);
  const [selectedMeds, setSelectedMeds] = useState<string[]>(
    medications.length > 0 ? [medications[0].id] : [],
  );

  const drillData = useMemo(
    () => getDrillDownData(selectedSymptoms, selectedMeds),
    [getDrillDownData, selectedSymptoms, selectedMeds],
  );

  const chartData = useMemo(() => {
    if (checkinDates.length < 2) {
      return { dailyRows: [] as SymptomBandRow[], segmentKeysByLine: {} as Record<string, string[]> };
    }

    const sparse: SymptomBandRow[] = checkinDates.map((date) => {
      const point: SymptomBandRow = {
        date,
        dateLabel: formatChartDate(date),
      };
      for (const line of drillData.symptomLines) {
        const match = line.points.find((p) => p.date === date);
        point[line.key] = match?.value ?? null;
      }
      return point;
    });

    const valueKeys = drillData.symptomLines.map((line) => line.key);
    const window = weeklyChartWindow(checkinDates, checkinDates[0], checkinDates[checkinDates.length - 1]);
    const { dailyRows, weeklySegmentKeys } = buildDailyIndexedWeeklyChart(
      sparse,
      window.start,
      window.end,
      valueKeys,
    );
    return { dailyRows: dailyRows as SymptomBandRow[], segmentKeysByLine: weeklySegmentKeys };
  }, [checkinDates, drillData.symptomLines]);

  const window = useMemo(() => {
    if (checkinDates.length < 2) return null;
    return weeklyChartWindow(checkinDates, checkinDates[0], checkinDates[checkinDates.length - 1]);
  }, [checkinDates]);

  const domainDates = useMemo(() => chartData.dailyRows.map((d) => d.date), [chartData.dailyRows]);

  const selectedMedications = useMemo(
    () => medications.filter((m) => selectedMeds.includes(m.id)),
    [medications, selectedMeds],
  );

  const laneRows = useMemo(() => {
    if (!window || domainDates.length === 0) return [];
    return buildMedicationLaneRows(
      selectedMedications,
      changeMarkers.map((m) => m.change),
      domainDates,
      window.start,
      window.end,
    );
  }, [selectedMedications, changeMarkers, domainDates, window]);

  const markerLines = useMemo(() => {
    if (!window || domainDates.length === 0) return [];
    const selectedChanges = changeMarkers
      .filter((m) => m.change.medication_id && selectedMeds.includes(m.change.medication_id))
      .map((m) => m.change);
    return doseChangeMarkerPercents(selectedChanges, domainDates, window.start, window.end);
  }, [changeMarkers, selectedMeds, domainDates, window]);

  const toggleSymptom = useCallback((key: string) => {
    setSelectedSymptoms((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_SYMPTOMS) return prev;
      return [...prev, key];
    });
  }, []);

  const toggleMed = useCallback((id: string) => {
    setSelectedMeds((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= MAX_MEDS) return prev;
      return [...prev, id];
    });
  }, []);

  const isEmpty = checkinDates.length < 2;

  const tooltipSeries: BandTooltipSeries[] = useMemo(
    () =>
      drillData.symptomLines.map((line) => ({
        name: line.label,
        dataKey: line.key,
        domainMax: DOMAIN_MAX,
      })),
    [drillData.symptomLines],
  );

  return (
    <ChartCard
      title="Compare Symptoms & Medications"
      description="Select up to 3 symptoms and 3 medications to compare"
      isEmpty={isEmpty}
      emptyState={{ message: 'Need at least 2 check-ins for comparison charts.' }}
      minHeight="360px"
      expandable
      expandedMinHeight="70vh"
    >
      {({ interactive }) =>
        !isEmpty ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-sage-500">Symptoms:</span>
              {MRS_CORE_SYMPTOMS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSymptom(s.key)}
                  className={[
                    'max-w-[9.5rem] rounded-2xl px-3 py-1.5 text-center text-xs font-medium leading-snug break-words transition-colors',
                    selectedSymptoms.includes(s.key)
                      ? 'bg-sage-500 text-on-accent'
                      : 'border border-sand-200 text-sage-600 hover:bg-sage-50',
                  ].join(' ')}
                >
                  {getSymptomChipLabel(s)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-sage-500">Medications:</span>
              {medications.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMed(m.id)}
                  className={[
                    'max-w-[9.5rem] rounded-2xl px-3 py-1.5 text-center text-xs font-medium leading-snug break-words transition-colors',
                    selectedMeds.includes(m.id)
                      ? 'bg-sage-500 text-on-accent'
                      : 'border border-sand-200 text-sage-600 hover:bg-sage-50',
                  ].join(' ')}
                >
                  {m.medication_name}
                </button>
              ))}
            </div>

            <CompareBody
              interactive={interactive}
              dailyRows={chartData.dailyRows}
              segmentKeysByLine={chartData.segmentKeysByLine}
              symptomLines={drillData.symptomLines}
              tooltipSeries={tooltipSeries}
              laneRows={laneRows}
              markerLines={markerLines}
            />
          </div>
        ) : null
      }
    </ChartCard>
  );
}
