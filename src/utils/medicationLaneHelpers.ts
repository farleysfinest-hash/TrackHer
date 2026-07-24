import type { Medication, MedicationChange } from '../types/database';
import { getMedLaneRamp } from './chartHelpers';
import { civilDateOrdinal, todayISO } from './localDate';
import { formatFrequency } from './medicationHelpers';

/** ~2px visual gap between dose-change segments at typical lane widths */
export const MED_LANE_SEGMENT_GAP_PCT = 0.35;

export const CHART_MARGIN_LEFT = 52;
export const CHART_MARGIN_RIGHT = 28;

/** Vertical space reserved under a lane bar for hanging dose-change labels. */
export const LANE_BOUNDARY_LABEL_CLEARANCE_PX = 16;

/**
 * Near the plot edges, center-anchored labels clip. Switch to start/end
 * anchoring inside this percent band from either end.
 */
export const BOUNDARY_LABEL_EDGE_PCT = 6;

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
  medicationId: string;
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

export interface DoseChangeMarkerPercent {
  id: string;
  medicationId: string;
  leftPercent: number;
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

/**
 * CSS transform for a hanging boundary label so endpoint labels stay inside the track.
 * Returns translateX percentage relative to the label's own width.
 */
export function boundaryLabelTranslateX(leftPercent: number): number {
  if (leftPercent <= BOUNDARY_LABEL_EDGE_PCT) return 0;
  if (leftPercent >= 100 - BOUNDARY_LABEL_EDGE_PCT) return -100;
  return -50;
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

/** True when the medication's active calendar span overlaps [windowStart, windowEnd]. */
export function medicationOverlapsWindow(
  med: Pick<Medication, 'start_date' | 'end_date'>,
  windowStart: string,
  windowEnd: string,
  today: string = todayISO(),
): boolean {
  return med.start_date <= windowEnd && (med.end_date ?? today) >= windowStart;
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
    .filter((m) => medicationOverlapsWindow(m, windowStart, windowEnd, today))
    .sort((a, b) => a.medication_name.localeCompare(b.medication_name));

  return activeMeds
    .map((med) => {
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
            medicationId: med.id,
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
    })
    .filter((row) => row.segments.length > 0);
}

/** Dose increases/decreases only — not starts/stops (lane bar edges carry those). */
export function doseChangeMarkerPercents(
  changes: MedicationChange[],
  domainDates: string[],
  windowStart: string,
  windowEnd: string,
): DoseChangeMarkerPercent[] {
  return changes
    .filter(
      (c): c is MedicationChange & { medication_id: string } =>
        c.medication_id != null &&
        (c.change_type === 'dose_increased' || c.change_type === 'dose_decreased') &&
        c.change_date >= windowStart &&
        c.change_date <= windowEnd,
    )
    .map((c) => ({
      id: c.id,
      medicationId: c.medication_id,
      leftPercent: dateToCategoryPercent(c.change_date, domainDates),
    }));
}

/** Pixel height for the stacked lane block (names + bars + per-row label reserves). */
export function medicationLaneBlockHeight(rows: MedicationLaneRow[]): number {
  if (rows.length === 0) return 0;
  const NAME_AND_BAR = 26;
  return rows.reduce(
    (sum, row) =>
      sum + NAME_AND_BAR + (row.boundaries.length > 0 ? LANE_BOUNDARY_LABEL_CLEARANCE_PX : 0),
    4,
  );
}
