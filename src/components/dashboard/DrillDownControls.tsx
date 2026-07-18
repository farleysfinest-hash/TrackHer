import { useCallback, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ChartCard } from '../ui/ChartCard';
import { ChartTooltipContent } from './ChartTooltipContent';
import { MRS_CORE_SYMPTOMS, getSymptomChipLabel } from '../../data/symptoms';
import { DRILL_DOWN_COLORS, CHART_COLORS, formatChartDate } from '../../utils/chartHelpers';
import { buildDailyIndexedWeeklyChart, weeklyChartWindow } from '../../utils/weeklyChartSeries';
import {
  assignRenderOffsets,
  buildDisplayRows,
  displayDataKey,
} from '../../utils/chartOverlap';
import { WeeklySegmentLines } from './WeeklySegmentLines';
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
const DOMAIN_SPAN = 4;

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
    if (checkinDates.length < 2) return { dailyRows: [], segmentKeysByLine: {} as Record<string, string[]> };

    const sparse = checkinDates.map((date) => {
      const point: Record<string, string | number | null> = {
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
    const offsets = assignRenderOffsets(valueKeys, sparse, DOMAIN_SPAN);
    const displaySparse = buildDisplayRows(sparse, valueKeys, offsets);
    const displayKeys = valueKeys.map(displayDataKey);
    const window = weeklyChartWindow(checkinDates, checkinDates[0], checkinDates[checkinDates.length - 1]);
    const { dailyRows, weeklySegmentKeys } = buildDailyIndexedWeeklyChart(
      displaySparse as unknown as Array<{ date: string }>,
      window.start,
      window.end,
      displayKeys,
    );
    return { dailyRows, segmentKeysByLine: weeklySegmentKeys };
  }, [checkinDates, drillData.symptomLines]);

  const medMarkers = changeMarkers.filter(
    (m) => m.change.medication_id && selectedMeds.includes(m.change.medication_id),
  );

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

  return (
    <ChartCard
      title="Compare Symptoms & Medications"
      description="Select up to 3 symptoms and 3 medications to compare"
      isEmpty={isEmpty}
      emptyState={{ message: 'Need at least 2 check-ins for comparison charts.' }}
      minHeight="360px"
    >
      {!isEmpty && (
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
                    ? 'bg-sage-500 text-white'
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
                    ? 'bg-sage-500 text-white'
                    : 'border border-sand-200 text-sage-600 hover:bg-sage-50',
                ].join(' ')}
              >
                {m.medication_name}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.dailyRows} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
              <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} width={24} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {drillData.symptomLines.map((line, i) => {
                const color = DRILL_DOWN_COLORS[i % DRILL_DOWN_COLORS.length];
                const displayKey = displayDataKey(line.key);
                return (
                  <WeeklySegmentLines
                    key={line.key}
                    segmentKeys={chartData.segmentKeysByLine[displayKey] ?? []}
                    name={line.label}
                    stroke={color}
                  />
                );
              })}
              {medMarkers.map((marker) => (
                <ReferenceLine
                  key={marker.id}
                  x={marker.dateLabel}
                  stroke={CHART_COLORS.changeLine}
                  strokeDasharray="4 4"
                  label={{ value: marker.label, position: 'top', fontSize: 9 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
