import { useMemo, useCallback } from 'react';
import { useCheckins } from './useCheckins';
import { useMedications } from './useMedications';
import { useMedicationChanges } from './useMedicationChanges';
import { useLabResults } from './useLabResults';
import type { SymptomCheckin, Medication, MedicationChange } from '../types/database';
import { MRS_CORE_SYMPTOMS } from '../data/symptoms';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { formatChartDate, filterByDateRange } from '../utils/chartHelpers';
import type { DateRange } from '../stores/dashboardStore';
import { getBiomarkerValue } from '../utils/labHelpers';

export interface SymptomTrendPoint {
  date: string;
  dateLabel: string;
  mrsTotal: number;
  wellbeing: number | null;
  somatic: number;
  psychological: number;
  urogenital: number;
  checkin: SymptomCheckin;
}

export interface ChangeMarker {
  id: string;
  date: string;
  dateLabel: string;
  label: string;
  change: MedicationChange;
  medicationName?: string;
}

export interface MedicationBar {
  id: string;
  name: string;
  hormoneCategory: string;
  startDate: string;
  endDate: string;
  dose: number;
  doseUnit: string;
}

export interface HeatmapRow {
  symptomKey: string;
  label: string;
  avgSeverity: number;
  cells: Array<{ date: string; dateLabel: string; score: number | null }>;
}

export interface LabTrendPoint {
  date: string;
  dateLabel: string;
  value: number;
}

function buildChangeLabel(change: MedicationChange, med?: Medication | null): string {
  const name = med?.medication_name ?? 'Med';
  const short = name.length > 14 ? name.slice(0, 12) + '…' : name;
  switch (change.change_type) {
    case 'started':
      return `Started ${short}${change.new_dose ? ` ${change.new_dose}` : ''}`;
    case 'dose_increased':
    case 'dose_decreased':
      return `↑ ${short} → ${change.new_dose}`;
    case 'stopped':
      return `Stopped ${short}`;
    case 'frequency_changed':
      return `${short} freq changed`;
    default:
      return short;
  }
}

export function useChartData(dateRange: DateRange) {
  const { checkins, fetchCheckins } = useCheckins();
  const { medications, fetchMedications } = useMedications();
  const { changes, fetchChanges } = useMedicationChanges();
  const { labResults, fetchLabResults } = useLabResults();

  const filteredCheckins = useMemo(
    () =>
      filterByDateRange(checkins, dateRange, 'checkin_date').sort((a, b) =>
        a.checkin_date.localeCompare(b.checkin_date),
      ),
    [checkins, dateRange],
  );

  const filteredChanges = useMemo(
    () =>
      filterByDateRange(changes, dateRange, 'change_date').sort((a, b) =>
        a.change_date.localeCompare(b.change_date),
      ),
    [changes, dateRange],
  );

  const filteredLabs = useMemo(
    () =>
      filterByDateRange(labResults, dateRange, 'draw_date').sort((a, b) =>
        a.draw_date.localeCompare(b.draw_date),
      ),
    [labResults, dateRange],
  );

  const allMedicationChanges = useMemo(
    () => changes.map(({ medication: _medication, ...change }) => change),
    [changes],
  );

  const getSymptomTrendData = useCallback((): SymptomTrendPoint[] => {
    return filteredCheckins.map((c) => ({
      date: c.checkin_date,
      dateLabel: formatChartDate(c.checkin_date),
      mrsTotal: c.total_score,
      wellbeing: c.overall_wellbeing,
      somatic: c.somatic_score,
      psychological: c.psychological_score,
      urogenital: c.urogenital_score,
      checkin: c,
    }));
  }, [filteredCheckins]);

  const getMedicationChangeMarkers = useCallback((): ChangeMarker[] => {
    const medMap = new Map(medications.map((m) => [m.id, m]));
    return filteredChanges.map((change) => ({
      id: change.id,
      date: change.change_date,
      dateLabel: formatChartDate(change.change_date),
      label: buildChangeLabel(change, medMap.get(change.medication_id ?? '')),
      change,
      medicationName: medMap.get(change.medication_id ?? '')?.medication_name,
    }));
  }, [filteredChanges, medications]);

  const getMedicationTimelineData = useCallback((): MedicationBar[] => {
    const today = new Date().toISOString().split('T')[0];
    return medications
      .filter((m) => m.start_date <= dateRange.end && (m.end_date ?? today) >= dateRange.start)
      .map((m) => ({
        id: m.id,
        name: m.medication_name,
        hormoneCategory: m.hormone_category,
        startDate: m.start_date,
        endDate: m.end_date ?? today,
        dose: m.dose_amount,
        doseUnit: m.dose_unit,
      }));
  }, [medications, dateRange]);

  const getHeatmapData = useCallback((): HeatmapRow[] => {
    const rows = MRS_CORE_SYMPTOMS.map((symptom) => {
      const key = symptom.key as MRSSymptomKey;
      const cells = filteredCheckins.map((c) => ({
        date: c.checkin_date,
        dateLabel: formatChartDate(c.checkin_date),
        score: c[key] as number | null,
      }));
      const rated = cells.filter((cell) => cell.score !== null);
      const avg =
        rated.length > 0
          ? rated.reduce((s, cell) => s + (cell.score ?? 0), 0) / rated.length
          : 0;
      return { symptomKey: key, label: symptom.label, avgSeverity: avg, cells };
    });

    return rows.sort((a, b) => b.avgSeverity - a.avgSeverity);
  }, [filteredCheckins]);

  const getLabTrendData = useCallback(
    (biomarkerKey: string): LabTrendPoint[] => {
      return filteredLabs
        .map((lab) => {
          const value = getBiomarkerValue(lab, biomarkerKey);
          if (value === null) return null;
          return {
            date: lab.draw_date,
            dateLabel: formatChartDate(lab.draw_date),
            value,
          };
        })
        .filter((p): p is LabTrendPoint => p !== null);
    },
    [filteredLabs],
  );

  const getDrillDownData = useCallback(
    (symptomKeys: string[], _medicationIds: string[]) => {
      const symptomLines = symptomKeys.map((key) => ({
        key,
        label: MRS_CORE_SYMPTOMS.find((s) => s.key === key)?.label ?? key,
        points: filteredCheckins.map((c) => ({
          date: c.checkin_date,
          dateLabel: formatChartDate(c.checkin_date),
          value: (c[key as MRSSymptomKey] as number | null) ?? null,
        })),
      }));
      return { symptomLines, checkins: filteredCheckins };
    },
    [filteredCheckins],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchCheckins(100), fetchMedications(), fetchChanges(), fetchLabResults()]);
  }, [fetchCheckins, fetchMedications, fetchChanges, fetchLabResults]);

  return {
    checkins: filteredCheckins,
    allCheckins: checkins,
    medications,
    allMedicationChanges,
    changes: filteredChanges,
    labResults: filteredLabs,
    allLabResults: labResults,
    getSymptomTrendData,
    getMedicationChangeMarkers,
    getMedicationTimelineData,
    getHeatmapData,
    getLabTrendData,
    getDrillDownData,
    refreshAll,
  };
}
