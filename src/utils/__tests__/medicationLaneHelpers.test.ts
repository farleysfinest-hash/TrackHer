import { describe, expect, it } from 'vitest';
import type { Medication, MedicationChange } from '../../types/database';
import {
  boundaryLabelTranslateX,
  buildMedicationLaneRows,
  doseChangeMarkerPercents,
  medicationLaneBlockHeight,
  medicationOverlapsWindow,
} from '../medicationLaneHelpers';

const USER_ID = 'user-test';
const WINDOW_START = '2026-01-01';
const WINDOW_END = '2026-03-31';
const TODAY = '2026-07-01';

/** Daily domain spanning the chart window — keeps % math deterministic. */
function domainBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

const DOMAIN = domainBetween(WINDOW_START, WINDOW_END);

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    user_id: USER_ID,
    hormone_category: 'estrogen',
    delivery_method: 'patch',
    medication_name: 'Estradiol patch',
    dose_amount: 0.05,
    dose_unit: 'mg',
    units_per_dose: 1,
    secondary_dose_amount: null,
    secondary_dose_unit: null,
    tertiary_dose_amount: null,
    tertiary_dose_unit: null,
    frequency: 'twice_weekly',
    frequency_details: null,
    application_site: null,
    start_date: '2025-12-01',
    end_date: null,
    is_active: true,
    prescriber_name: null,
    pharmacy_name: null,
    notes: null,
    pellet_insertion_date: null,
    pellet_expected_duration_months: null,
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
    ...overrides,
  };
}

function makeChange(overrides: Partial<MedicationChange> = {}): MedicationChange {
  return {
    id: 'change-1',
    user_id: USER_ID,
    medication_id: 'med-1',
    change_type: 'dose_increased',
    previous_dose: 0.05,
    new_dose: 0.075,
    previous_method: null,
    new_method: null,
    change_date: '2026-02-01',
    notes: null,
    created_at: '2026-02-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildMedicationLaneRows', () => {
  it('builds separate rows for multiple medications with overlapping dates (Progesterone / Vivelle-Dot regression)', () => {
    const progesterone = makeMedication({
      id: 'med-prog',
      medication_name: 'Progesterone',
      hormone_category: 'progesterone',
      delivery_method: 'oral_capsule',
      dose_amount: 100,
      dose_unit: 'mg',
      frequency: 'daily',
      start_date: '2025-11-01',
    });
    const vivelle = makeMedication({
      id: 'med-vivelle',
      medication_name: 'Vivelle-Dot',
      hormone_category: 'estrogen',
      delivery_method: 'patch',
      dose_amount: 0.05,
      dose_unit: 'mg',
      frequency: 'twice_weekly',
      start_date: '2025-12-15',
    });
    const changes = [
      makeChange({
        id: 'chg-prog',
        medication_id: 'med-prog',
        change_type: 'dose_increased',
        previous_dose: 100,
        new_dose: 200,
        change_date: '2026-02-10',
      }),
      makeChange({
        id: 'chg-vivelle',
        medication_id: 'med-vivelle',
        change_type: 'dose_increased',
        previous_dose: 0.05,
        new_dose: 0.075,
        change_date: '2026-02-10',
      }),
    ];

    const rows = buildMedicationLaneRows(
      [progesterone, vivelle],
      changes,
      DOMAIN,
      WINDOW_START,
      WINDOW_END,
      TODAY,
    );

    expect(rows.map((r) => r.medicationId).sort()).toEqual(['med-prog', 'med-vivelle']);
    expect(rows.every((r) => r.segments.length >= 1)).toBe(true);
    // Same change date on two meds — labels stay on their own rows via medicationId
    const prog = rows.find((r) => r.medicationId === 'med-prog')!;
    const viv = rows.find((r) => r.medicationId === 'med-vivelle')!;
    expect(prog.boundaries).toHaveLength(1);
    expect(viv.boundaries).toHaveLength(1);
    expect(prog.boundaries[0].medicationId).toBe('med-prog');
    expect(viv.boundaries[0].medicationId).toBe('med-vivelle');
    expect(prog.boundaries[0].leftPercent).toBe(viv.boundaries[0].leftPercent);
    expect(medicationLaneBlockHeight(rows)).toBeGreaterThan(medicationLaneBlockHeight([prog]));
  });

  it('supports multiple dose changes on one medication', () => {
    const med = makeMedication({ id: 'med-multi', dose_amount: 50, dose_unit: 'mg' });
    const changes = [
      makeChange({
        id: 'c1',
        medication_id: 'med-multi',
        change_type: 'dose_increased',
        previous_dose: 50,
        new_dose: 75,
        change_date: '2026-01-15',
      }),
      makeChange({
        id: 'c2',
        medication_id: 'med-multi',
        change_type: 'dose_decreased',
        previous_dose: 75,
        new_dose: 60,
        change_date: '2026-02-20',
      }),
      makeChange({
        id: 'c3',
        medication_id: 'med-multi',
        change_type: 'dose_increased',
        previous_dose: 60,
        new_dose: 100,
        change_date: '2026-03-10',
      }),
    ];

    const rows = buildMedicationLaneRows([med], changes, DOMAIN, WINDOW_START, WINDOW_END, TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0].segments).toHaveLength(4);
    expect(rows[0].boundaries).toHaveLength(3);
    expect(rows[0].boundaries.every((b) => b.medicationId === 'med-multi')).toBe(true);
    expect(rows[0].boundaries.map((b) => b.id)).toEqual(['c1', 'c2', 'c3']);
    expect(rows[0].segments.map((s) => s.dose)).toEqual([50, 75, 60, 100]);
  });

  it('supports a custom medication name and dose unit', () => {
    const custom = makeMedication({
      id: 'med-custom',
      medication_name: "Mom's compound cream",
      hormone_category: 'other',
      delivery_method: 'cream',
      dose_amount: 2,
      dose_unit: 'pumps',
      frequency: 'custom',
      start_date: '2026-01-10',
    });
    const changes = [
      makeChange({
        id: 'c-custom',
        medication_id: 'med-custom',
        change_type: 'dose_increased',
        previous_dose: 2,
        new_dose: 3,
        change_date: '2026-02-01',
      }),
    ];

    const rows = buildMedicationLaneRows([custom], changes, DOMAIN, WINDOW_START, WINDOW_END, TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0].medicationName).toBe("Mom's compound cream");
    expect(rows[0].rowLabel).toContain("Mom's compound cream");
    expect(rows[0].rowLabel).toContain('other');
    expect(rows[0].segments[0].doseUnit).toBe('pumps');
    expect(rows[0].segments[0].doseLabel).toBe('2 pumps');
    expect(rows[0].boundaries[0].label).toContain('pumps');
  });

  it('includes a discontinued medication whose active period overlaps the range', () => {
    const discontinued = makeMedication({
      id: 'med-stopped',
      medication_name: 'Old patch',
      is_active: false,
      start_date: '2025-10-01',
      end_date: '2026-02-15',
    });

    expect(medicationOverlapsWindow(discontinued, WINDOW_START, WINDOW_END, TODAY)).toBe(true);

    const rows = buildMedicationLaneRows(
      [discontinued],
      [],
      DOMAIN,
      WINDOW_START,
      WINDOW_END,
      TODAY,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].medicationId).toBe('med-stopped');
    expect(rows[0].segments[0].endDate).toBe('2026-02-15');
  });

  it('excludes a medication whose active period does not overlap the range', () => {
    const before = makeMedication({
      id: 'med-before',
      start_date: '2025-01-01',
      end_date: '2025-06-01',
      is_active: false,
    });
    const after = makeMedication({
      id: 'med-after',
      start_date: '2026-06-01',
      end_date: null,
      is_active: true,
    });

    expect(medicationOverlapsWindow(before, WINDOW_START, WINDOW_END, TODAY)).toBe(false);
    expect(medicationOverlapsWindow(after, WINDOW_START, WINDOW_END, TODAY)).toBe(false);

    const rows = buildMedicationLaneRows(
      [before, after],
      [],
      DOMAIN,
      WINDOW_START,
      WINDOW_END,
      TODAY,
    );
    expect(rows).toHaveLength(0);
  });

  it('returns an empty lane list when there are no medications', () => {
    const rows = buildMedicationLaneRows([], [], DOMAIN, WINDOW_START, WINDOW_END, TODAY);
    expect(rows).toEqual([]);
    expect(medicationLaneBlockHeight(rows)).toBe(0);
    expect(doseChangeMarkerPercents([], DOMAIN, WINDOW_START, WINDOW_END)).toEqual([]);
  });

  it('keeps dose-change labels attached to the correct medication row by medication_id', () => {
    const a = makeMedication({ id: 'med-a', medication_name: 'Alpha', dose_unit: 'mg' });
    const b = makeMedication({ id: 'med-b', medication_name: 'Beta', dose_unit: 'mcg' });
    const changes = [
      makeChange({
        id: 'chg-a',
        medication_id: 'med-a',
        previous_dose: 1,
        new_dose: 2,
        change_date: '2026-01-20',
      }),
      makeChange({
        id: 'chg-b',
        medication_id: 'med-b',
        previous_dose: 10,
        new_dose: 20,
        change_date: '2026-01-20',
      }),
    ];

    const rows = buildMedicationLaneRows([a, b], changes, DOMAIN, WINDOW_START, WINDOW_END, TODAY);
    const rowA = rows.find((r) => r.medicationId === 'med-a')!;
    const rowB = rows.find((r) => r.medicationId === 'med-b')!;

    expect(rowA.boundaries.map((b) => b.id)).toEqual(['chg-a']);
    expect(rowB.boundaries.map((b) => b.id)).toEqual(['chg-b']);
    expect(rowA.boundaries[0].medicationId).toBe('med-a');
    expect(rowB.boundaries[0].medicationId).toBe('med-b');
    expect(rowA.boundaries[0].label).toContain('mg');
    expect(rowB.boundaries[0].label).toContain('mcg');

    const markers = doseChangeMarkerPercents(changes, DOMAIN, WINDOW_START, WINDOW_END);
    expect(markers).toHaveLength(2);
    expect(markers.find((m) => m.id === 'chg-a')?.medicationId).toBe('med-a');
    expect(markers.find((m) => m.id === 'chg-b')?.medicationId).toBe('med-b');
  });

  it('clips medications that start or stop inside the selected chart range', () => {
    const startsInside = makeMedication({
      id: 'med-start-in',
      start_date: '2026-02-01',
      end_date: null,
    });
    const stopsInside = makeMedication({
      id: 'med-stop-in',
      start_date: '2025-06-01',
      end_date: '2026-02-15',
      is_active: false,
    });

    const rows = buildMedicationLaneRows(
      [startsInside, stopsInside],
      [],
      DOMAIN,
      WINDOW_START,
      WINDOW_END,
      TODAY,
    );

    const startRow = rows.find((r) => r.medicationId === 'med-start-in')!;
    const stopRow = rows.find((r) => r.medicationId === 'med-stop-in')!;
    expect(startRow.segments[0].startDate).toBe('2026-02-01');
    expect(startRow.segments[0].leftPercent).toBeGreaterThan(0);
    expect(stopRow.segments[0].endDate).toBe('2026-02-15');
    expect(stopRow.segments[0].leftPercent + stopRow.segments[0].widthPercent).toBeLessThan(100);
  });
});

describe('boundaryLabelTranslateX', () => {
  it('left-aligns near 0%, right-aligns near 100%, centers otherwise', () => {
    expect(boundaryLabelTranslateX(0)).toBe(0);
    expect(boundaryLabelTranslateX(5)).toBe(0);
    expect(boundaryLabelTranslateX(50)).toBe(-50);
    expect(boundaryLabelTranslateX(95)).toBe(-100);
    expect(boundaryLabelTranslateX(100)).toBe(-100);
  });
});
