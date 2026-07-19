import { useMemo, useCallback } from 'react';
import { useCheckins } from './useCheckins';
import { useMedications } from './useMedications';
import { useMedicationChanges } from './useMedicationChanges';
import { useLabResults } from './useLabResults';
import type { SymptomCheckin, Medication, MedicationChange } from '../types/database';
import { MRS_CANONICAL_SYMPTOMS } from '../data/symptoms';
import type { MRSSymptomKey } from '../utils/checkinHelpers';
import { hasMRSData, getDailySignal, getTrustedMrsTotal } from '../utils/checkinHelpers';
import { formatChartDate, filterByDateRange, meanHeatmapSeverity, recentHeatmapSeverity, sortHeatmapRows } from '../utils/chartHelpers';
import { addDaysISO } from '../utils/localDate';
import { getBiomarkerValue } from '../utils/labHelpers';
import type { DateRange } from '../stores/dashboardStore';

export interface SymptomTrendPoint {
  date: string;
  dateLabel: string;
  mrsTotal: number | null;
  wellbeing: number | null; // daily energy signal (1–5), legacy-normalized
  somatic: number | null;
  psychological: number | null;
  urogenital: number | null;
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

export interface HeatmapRow {
  symptomKey: string;
  label: string;
  avgSeverity: number;
  recentSeverity: number;
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
  const {
    checkins,
    mrsCheckinCount,
    earliestCheckinDate,
    fetchCheckinsRange,
    isLoading: checkinsLoading,
  } = useCheckins();
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

  const mrsCheckins = useMemo(
    () => filteredCheckins.filter(hasMRSData),
    [filteredCheckins],
  );

  const getSymptomTrendData = useCallback((): SymptomTrendPoint[] => {
    return filteredCheckins.map((c) => {
      const trustedTotal = getTrustedMrsTotal(c);
      const includeMrs = trustedTotal !== null;
      return {
        date: c.checkin_date,
        dateLabel: formatChartDate(c.checkin_date),
        mrsTotal: trustedTotal,
        wellbeing: getDailySignal(c),
        somatic: includeMrs ? c.somatic_score : null,
        psychological: includeMrs ? c.psychological_score : null,
        urogenital: includeMrs ? c.urogenital_score : null,
        checkin: c,
      };
    });
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

  /** The heatmap is a "right now" instrument: it shows the most recent check-ins only,
   *  and it ranks on exactly the columns it displays. Do not widen this to the global
   *  date range — a ranking computed from off-screen data is what broke this surface. */
  const HEATMAP_WINDOW = 8;

  const getHeatmapData = useCallback((): HeatmapRow[] => {
    const windowCheckins = [...mrsCheckins]
      .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
      .slice(-HEATMAP_WINDOW);

    const rows = MRS_CANONICAL_SYMPTOMS.map((symptom) => {
      const key = symptom.key as MRSSymptomKey;
      const cells = windowCheckins.map((c) => ({
        date: c.checkin_date,
        dateLabel: formatChartDate(c.checkin_date),
        score: c[key] as number | null,
      }));
      const avg = meanHeatmapSeverity(cells);
      const recent = recentHeatmapSeverity(cells);
      return { symptomKey: key, label: symptom.label, avgSeverity: avg, recentSeverity: recent, cells };
    });

    return sortHeatmapRows(rows);
  }, [mrsCheckins]);

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
        label: MRS_CANONICAL_SYMPTOMS.find((s) => s.key === key)?.label ?? key,
        points: mrsCheckins.map((c) => ({
          date: c.checkin_date,
          dateLabel: formatChartDate(c.checkin_date),
          value: (c[key as MRSSymptomKey] as number | null) ?? null,
        })),
      }));
      return { symptomLines, checkins: mrsCheckins };
    },
    [mrsCheckins],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      // Keep one prior month in memory for the summary card's month-over-month baseline;
      // chart series below still filter strictly to the selected range.
      fetchCheckinsRange(addDaysISO(dateRange.start, -31), dateRange.end),
      fetchMedications(),
      fetchChanges(),
      fetchLabResults(),
    ]);
  }, [dateRange.end, dateRange.start, fetchCheckinsRange, fetchMedications, fetchChanges, fetchLabResults]);

  return {
    checkins: filteredCheckins,
    summaryCheckins: checkins,
    mrsCheckinCount,
    earliestCheckinDate,
    checkinsLoading,
    medications,
    allMedicationChanges,
    changes: filteredChanges,
    labResults: filteredLabs,
    allLabResults: labResults,
    getSymptomTrendData,
    getMedicationChangeMarkers,
    getHeatmapData,
    getLabTrendData,
    getDrillDownData,
    refreshAll,
  };
}
