import type { Medication, MedicationChange } from '../types/database';
import { getMedLaneRamp } from './chartHelpers';
import { civilDateOrdinal, todayISO } from './localDate';
import { formatFrequency } from './medicationHelpers';

/** ~2px visual gap between dose-change segments at typical lane widths */
export const MED_LANE_SEGMENT_GAP_PCT = 0.35;

export const CHART_MARGIN_LEFT = 36;
export const CHART_MARGIN_RIGHT = 28;

export interface MedicationLaneSegment {
  id: string;
  startDate: string;
  endDate: string;
  dose: number;
  doseUnit: string;
  doseLabel: string;
  color: string;
  leftPercent: number;
  widthPercent: number;
}

export interface MedicationLaneBoundary {
  id: string;
  date: string;
  label: string;
  leftPercent: number;
}

export interface MedicationLaneRow {
  medicationId: string;
  rowLabel: string;
  medicationName: string;
  segments: MedicationLaneSegment[];
  boundaries: MedicationLaneBoundary[];
}

interface DosePeriod {
  startDate: string;
  endDate: string;
  dose: number;
  doseUnit: string;
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function formatDoseAmount(dose: number, unit: string): string {
  const rounded = Number.isInteger(dose) ? String(dose) : String(dose);
  return `${rounded} ${unit}`;
}

export function formatLaneBoundaryLabel(change: MedicationChange, unit: string): string | null {
  if (change.change_type === 'dose_increased' || change.change_type === 'dose_decreased') {
    const arrow = change.change_type === 'dose_increased' ? '↑' : '↓';
    const prev = change.previous_dose ?? '?';
    const next = change.new_dose ?? '?';
    return `${arrow} ${prev} → ${next} ${unit}`;
  }
  return null;
}

export function buildMedicationRowLabel(med: Medication): string {
  return `${med.medication_name} · ${med.hormone_category} · ${formatFrequency(med.frequency).toLowerCase()}`;
}

/** Map a calendar date to horizontal % aligned with Recharts categorical spacing. */
export function dateToCategoryPercent(date: string, domainDates: string[]): number {
  if (domainDates.length === 0) return 50;
  if (domainDates.length === 1) return 50;

  const sorted = [...domainDates].sort((a, b) => a.localeCompare(b));
  if (date <= sorted[0]) return 0;
  if (date >= sorted[sorted.length - 1]) return 100;

  for (let i = 0; i < sorted.length - 1; i++) {
    const d0 = sorted[i];
    const d1 = sorted[i + 1];
    if (date >= d0 && date <= d1) {
      const t0 = civilDateOrdinal(d0);
      const t1 = civilDateOrdinal(d1);
      const tc = civilDateOrdinal(date);
      const frac = t1 === t0 ? 0 : (tc - t0) / (t1 - t0);
      return ((i + frac) / (sorted.length - 1)) * 100;
    }
  }

  return 100;
}

function buildDosePeriods(med: Medication, changes: MedicationChange[], today: string): DosePeriod[] {
  const medEnd = med.end_date ?? today;
  const medChanges = changes
    .filter((c) => c.medication_id === med.id)
    .sort((a, b) => a.change_date.localeCompare(b.change_date));

  if (medChanges.length === 0) {
    return [
      {
        startDate: med.start_date,
        endDate: medEnd,
        dose: med.dose_amount,
        doseUnit: med.dose_unit,
      },
    ];
  }

  const periods: DosePeriod[] = [];
  let currentStart = med.start_date;
  let currentDose = med.dose_amount;

  for (const change of medChanges) {
    if (change.change_type === 'started' && change.new_dose != null) {
      currentDose = change.new_dose;
      currentStart = change.change_date;
      continue;
    }

    if (change.change_type === 'dose_increased' || change.change_type === 'dose_decreased') {
      if (change.change_date > currentStart) {
        periods.push({
          startDate: currentStart,
          endDate: change.change_date,
          dose: currentDose,
          doseUnit: med.dose_unit,
        });
      }
      if (change.new_dose != null) currentDose = change.new_dose;
      currentStart = change.change_date;
      continue;
    }

    if (change.change_type === 'stopped') {
      if (change.change_date >= currentStart) {
        periods.push({
          startDate: currentStart,
          endDate: change.change_date,
          dose: currentDose,
          doseUnit: med.dose_unit,
        });
      }
      return periods;
    }
  }

  if (currentStart <= medEnd) {
    periods.push({
      startDate: currentStart,
      endDate: medEnd,
      dose: currentDose,
      doseUnit: med.dose_unit,
    });
  }

  return periods.length > 0
    ? periods
    : [
        {
          startDate: med.start_date,
          endDate: medEnd,
          dose: med.dose_amount,
          doseUnit: med.dose_unit,
        },
      ];
}

function clipPeriod(
  period: DosePeriod,
  windowStart: string,
  windowEnd: string,
): DosePeriod | null {
  const start = maxDate(period.startDate, windowStart);
  const end = minDate(period.endDate, windowEnd);
  if (start > end) return null;
  return { ...period, startDate: start, endDate: end };
}

export function buildMedicationLaneRows(
  medications: Medication[],
  changes: MedicationChange[],
  domainDates: string[],
  windowStart: string,
  windowEnd: string,
  today: string = todayISO(),
): MedicationLaneRow[] {
  const activeMeds = medications
    .filter((m) => m.start_date <= windowEnd && (m.end_date ?? today) >= windowStart)
    .sort((a, b) => a.medication_name.localeCompare(b.medication_name));

  return activeMeds.map((med) => {
    const periods = buildDosePeriods(med, changes, today)
      .map((p) => clipPeriod(p, windowStart, windowEnd))
      .filter((p): p is DosePeriod => p !== null);

    const hasDoseChange = periods.length > 1;
    const segments: MedicationLaneSegment[] = periods.map((period, index) => {
      let left = dateToCategoryPercent(period.startDate, domainDates);
      let right = dateToCategoryPercent(period.endDate, domainDates);
      if (hasDoseChange && index > 0) {
        left += MED_LANE_SEGMENT_GAP_PCT / 2;
      }
      if (hasDoseChange && index < periods.length - 1) {
        right -= MED_LANE_SEGMENT_GAP_PCT / 2;
      }
      const width = Math.max(right - left, 1.5);
      const ramp = getMedLaneRamp(med.hormone_category);
      const color = hasDoseChange && index > 0 ? ramp.deep : ramp.base;
      return {
        id: `${med.id}-${index}`,
        startDate: period.startDate,
        endDate: period.endDate,
        dose: period.dose,
        doseUnit: period.doseUnit,
        doseLabel: formatDoseAmount(period.dose, period.doseUnit),
        color,
        leftPercent: left,
        widthPercent: width,
      };
    });

    const boundaries: MedicationLaneBoundary[] = changes
      .filter((c) => c.medication_id === med.id)
      .map((change) => {
        const label = formatLaneBoundaryLabel(change, med.dose_unit);
        if (!label) return null;
        if (change.change_date < windowStart || change.change_date > windowEnd) return null;
        return {
          id: change.id,
          date: change.change_date,
          label,
          leftPercent: dateToCategoryPercent(change.change_date, domainDates),
        };
      })
      .filter((b): b is MedicationLaneBoundary => b !== null);

    return {
      medicationId: med.id,
      rowLabel: buildMedicationRowLabel(med),
      medicationName: med.medication_name,
      segments,
      boundaries,
    };
  });
}

/** Dose increases/decreases only — not starts/stops (lane bar edges carry those). */
export function doseChangeMarkerPercents(
  changes: MedicationChange[],
  domainDates: string[],
  windowStart: string,
  windowEnd: string,
): Array<{ id: string; leftPercent: number }> {
  return changes
    .filter(
      (c) =>
        (c.change_type === 'dose_increased' || c.change_type === 'dose_decreased') &&
        c.change_date >= windowStart &&
        c.change_date <= windowEnd,
    )
    .map((c) => ({
      id: c.id,
      leftPercent: dateToCategoryPercent(c.change_date, domainDates),
    }));
}
