import { MEDICATION_CATALOG } from '../data/medications';
import type { MedicationOption } from '../types/medications';
import type {
  HormoneCategory,
  DeliveryMethod,
  Medication,
  MedicationFrequency,
  MedicationChange,
  MedicationChangeType,
  MedicationAdministration,
} from '../types/database';
import { APPLICATION_SITE_LABELS } from '../lib/medicationConstants';
import {
  addDaysISO,
  addMonthsISO,
  daysBetweenISO,
  resolveEventLocalDate,
  todayISO,
} from './localDate';

export function getMethodsForHormone(hormone: HormoneCategory): DeliveryMethod[] {
  return [
    ...new Set(
      MEDICATION_CATALOG.filter((m) => m.hormoneCategory === hormone).map((m) => m.deliveryMethod),
    ),
  ];
}

export function getProductsForMethod(
  hormone: HormoneCategory,
  method: DeliveryMethod,
): MedicationOption[] {
  return MEDICATION_CATALOG.filter(
    (m) => m.hormoneCategory === hormone && m.deliveryMethod === method && m.key !== 'custom_medication',
  );
}

export function formatMedicationDisplay(med: Medication): string {
  return `${med.medication_name} ${formatMedicationDoseShort(med)}`;
}

export function getDosesPerDay(frequency: MedicationFrequency | string): number {
  switch (frequency) {
    case 'twice_daily':
      return 2;
    case 'three_times_daily':
      return 3;
    default:
      return 1;
  }
}

export function getUnitsPerDose(med: Pick<Medication, 'units_per_dose'>): number {
  return med.units_per_dose ?? 1;
}

export function getTotalPerAdministration(
  med: Pick<Medication, 'dose_amount' | 'units_per_dose'>,
): number {
  return med.dose_amount * getUnitsPerDose(med);
}

export function getEffectiveDailyDose(med: Medication): number {
  const perAdmin = getTotalPerAdministration(med);
  const administrationsPerDay = getDosesPerDay(med.frequency);

  if (med.frequency === 'cyclic') {
    const daysOn = Number(med.frequency_details?.days_on) || 0;
    const daysOff = Number(med.frequency_details?.days_off) || 0;
    const cycleLength = daysOn + daysOff;
    if (cycleLength > 0) {
      return (perAdmin * administrationsPerDay * daysOn) / cycleLength;
    }
  }

  if (med.frequency === 'every_other_day') {
    return (perAdmin * administrationsPerDay) / 2;
  }

  return perAdmin * administrationsPerDay;
}

export function formatTimeOfDay(timeOfDay: string | undefined | null): string {
  if (!timeOfDay) return '';
  const labels: Record<string, string> = {
    bedtime: 'bedtime',
    morning: 'morning',
    evening: 'evening',
    with_meals: 'with meals',
  };
  return labels[timeOfDay] ?? timeOfDay.replace(/_/g, ' ');
}

type DoseScheduleFields = Pick<
  Medication,
  'dose_amount' | 'dose_unit' | 'units_per_dose' | 'frequency' | 'frequency_details'
>;

export function formatMedicationDoseShort(med: DoseScheduleFields): string {
  const units = getUnitsPerDose(med);
  const timeOfDay = med.frequency_details?.time_of_day as string | undefined;

  let strength: string;
  if (units > 1) {
    strength = `${units} × ${med.dose_amount} ${med.dose_unit}`;
  } else {
    strength = `${med.dose_amount} ${med.dose_unit}`;
  }

  const timePart = timeOfDay ? ` at ${formatTimeOfDay(timeOfDay)}` : '';
  return `${strength}${timePart} · ${formatFrequency(med.frequency)}`;
}

export function formatMedicationDoseDetail(med: DoseScheduleFields): string {
  const units = getUnitsPerDose(med);
  const perAdmin = getTotalPerAdministration(med);
  const timeOfDay = med.frequency_details?.time_of_day as string | undefined;
  const base = formatMedicationDoseShort(med);

  if (units > 1) {
    const timePart = timeOfDay ? ` at ${formatTimeOfDay(timeOfDay)}` : '';
    return `${units} × ${med.dose_amount} ${med.dose_unit}${timePart} (${perAdmin} ${med.dose_unit} each time) · ${formatFrequency(med.frequency)}`;
  }

  return base;
}

export function supportsUnitsPerDose(method: DeliveryMethod): boolean {
  return [
    'oral_capsule',
    'oral_tablet',
    'troche',
    'sublingual',
    'gel',
    'spray',
    'nasal_spray',
    'vaginal_tablet',
  ].includes(method);
}

export function catalogHasFixedDoses(product: MedicationOption): boolean {
  return product.doseOptions.amounts.length > 0 && !product.allowCustomDose;
}

export function catalogOffersDoseShortcuts(product: MedicationOption): boolean {
  return product.doseOptions.amounts.length > 0;
}

export function formatFrequency(freq: MedicationFrequency | string): string {
  const labels: Record<string, string> = {
    daily: 'Daily',
    twice_daily: 'Twice daily',
    three_times_daily: 'Three times daily',
    weekly: 'Once weekly',
    twice_weekly: 'Twice weekly (every 3-4 days)',
    three_times_weekly: 'Three times weekly',
    every_other_day: 'Every other day',
    every_two_weeks: 'Every 2 weeks',
    every_three_weeks: 'Every 3 weeks',
    every_four_weeks: 'Every 4 weeks',
    monthly: 'Monthly',
    cyclic: 'Cyclic (see details)',
    as_needed: 'As needed',
    custom: 'Custom schedule',
    every_three_months: 'Every 3 months',
    every_four_months: 'Every 4 months',
    every_five_months: 'Every 5 months',
    every_six_months: 'Every 6 months',
  };
  return labels[freq] ?? freq;
}

export function formatApplicationSite(site: string | null): string {
  if (!site) return '';
  return APPLICATION_SITE_LABELS[site] ?? site.replace(/_/g, ' ');
}

export function getHormoneColor(category: HormoneCategory): string {
  const colors: Record<HormoneCategory, string> = {
    estrogen: 'text-sage-700 bg-sage-500/10',
    progesterone: 'text-sage-600 bg-sage-400/10',
    testosterone: 'text-sage-800 bg-sage-800/10',
    combination: 'text-sage-700 bg-sage-500/10',
    dhea: 'text-sage-500 bg-sage-300/10',
    oxytocin: 'text-sage-500 bg-sage-300/10',
    thyroid: 'text-sage-500 bg-sage-300/10',
    supplement: 'text-sage-500 bg-sage-300/10',
    other: 'text-sage-500 bg-sage-300/10',
  };
  return colors[category] ?? colors.other;
}

export function getHormoneLabel(category: HormoneCategory): string {
  const labels: Record<HormoneCategory, string> = {
    estrogen: 'Estrogen',
    progesterone: 'Progesterone',
    testosterone: 'Testosterone',
    combination: 'Combination',
    dhea: 'DHEA',
    oxytocin: 'Oxytocin',
    thyroid: 'Thyroid',
    supplement: 'Supplement',
    other: 'Other',
  };
  return labels[category] ?? 'Other';
}

export function getPelletReplacementDate(insertionDate: string, durationMonths: number): Date {
  const iso = addMonthsISO(insertionDate, durationMonths);
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isPelletDueSoon(
  insertionDate: string,
  durationMonths: number,
  today: string = todayISO(),
): boolean {
  const replacementDate = addMonthsISO(insertionDate, durationMonths);
  const twoWeeksFromNow = addDaysISO(today, 14);
  return replacementDate <= twoWeeksFromNow;
}

export function formatChangeTypeLabel(type: MedicationChangeType): string {
  const labels: Record<MedicationChangeType, string> = {
    started: 'Started',
    stopped: 'Discontinued',
    dose_increased: 'Dose increased',
    dose_decreased: 'Dose decreased',
    method_changed: 'Method changed',
    frequency_changed: 'Frequency changed',
    switched: 'Switched',
  };
  return labels[type] ?? type;
}

export function getMedicationChangeLabel(change: MedicationChange, med: Medication): string {
  switch (change.change_type) {
    case 'started':
      return `starting ${med.medication_name} ${change.new_dose} ${med.dose_unit}`;
    case 'stopped':
      return `stopping ${med.medication_name}`;
    case 'dose_increased':
      return `increasing ${med.medication_name} from ${change.previous_dose} to ${change.new_dose} ${med.dose_unit}`;
    case 'dose_decreased':
      return `decreasing ${med.medication_name} from ${change.previous_dose} to ${change.new_dose} ${med.dose_unit}`;
    case 'method_changed':
      return `changing ${med.medication_name} delivery method`;
    case 'frequency_changed':
      return `changing ${med.medication_name} frequency`;
    case 'switched':
      return `switching ${med.medication_name}`;
    default:
      return `changing ${med.medication_name}`;
  }
}

export function getMedicationChangePastLabel(change: MedicationChange, med: Medication): string {
  switch (change.change_type) {
    case 'started':
      return `Started ${med.medication_name} ${change.new_dose} ${med.dose_unit}`;
    case 'stopped':
      return `Stopped ${med.medication_name}`;
    case 'dose_increased':
      return `Increased ${med.medication_name} from ${change.previous_dose} to ${change.new_dose} ${med.dose_unit}`;
    case 'dose_decreased':
      return `Decreased ${med.medication_name} from ${change.previous_dose} to ${change.new_dose} ${med.dose_unit}`;
    case 'method_changed':
      return `Changed ${med.medication_name} delivery method`;
    case 'frequency_changed':
      return `Changed ${med.medication_name} frequency`;
    case 'switched':
      return `Switched ${med.medication_name}`;
    default:
      return `Changed ${med.medication_name}`;
  }
}

export function getDoseCycleDays(med: Pick<Medication, 'frequency'>): number | null {
  // Conservative: only handle clean integer-day cycles.
  switch (med.frequency) {
    case 'weekly':
      return 7;
    case 'every_two_weeks':
      return 14;
    case 'every_three_weeks':
      return 21;
    case 'every_four_weeks':
      return 28;
    default:
      return null;
  }
}

function daysBetweenDates(from: string, to: string): number {
  return daysBetweenISO(from, to);
}

const DAILY_DOSE_FREQUENCIES: MedicationFrequency[] = [
  'daily',
  'twice_daily',
  'three_times_daily',
  'every_other_day',
];

export function showDoseChip(med: Medication): boolean {
  if (!med.is_active) return false;
  if (med.delivery_method === 'pellet') return false;
  if (DAILY_DOSE_FREQUENCIES.includes(med.frequency)) return true;
  return getDoseCycleDays(med) !== null;
}

export function isDoseLoggedForMed(
  med: Medication,
  administrations: MedicationAdministration[],
  today: string,
  timezone = 'UTC',
): boolean {
  const medAdmins = administrations
    .filter((a) => a.medication_id === med.id)
    .sort((a, b) => b.taken_at.localeCompare(a.taken_at));

  if (medAdmins.length === 0) return false;

  if (DAILY_DOSE_FREQUENCIES.includes(med.frequency)) {
    return medAdmins.some(
      (a) => resolveEventLocalDate(a.taken_at, a.local_date, a.event_timezone, timezone) === today,
    );
  }

  const cycleDays = getDoseCycleDays(med);
  if (cycleDays) {
    const latest = medAdmins[0];
    const latestDate = resolveEventLocalDate(
      latest.taken_at,
      latest.local_date,
      latest.event_timezone,
      timezone,
    );
    return daysBetweenDates(latestDate, today) < cycleDays;
  }

  return false;
}

export { addDaysISO } from './localDate';

export function getChangeTimelineColor(type: MedicationChangeType): string {
  switch (type) {
    case 'started':
      return 'bg-success';
    case 'stopped':
      return 'bg-clay-500';
    case 'dose_increased':
    case 'dose_decreased':
    case 'frequency_changed':
      return 'bg-sage-500';
    case 'method_changed':
    case 'switched':
      return 'bg-sage-400';
    default:
      return 'bg-sage-400';
  }
}

export function needsApplicationSite(method: DeliveryMethod): boolean {
  return ['patch', 'cream', 'gel', 'spray'].includes(method);
}

export function formatDoseDisplay(amount: number, unit: string): string {
  return `${amount} ${unit}`;
}

export { todayISO } from './localDate';

export function findCatalogProductForMedication(med: Medication): MedicationOption | undefined {
  return MEDICATION_CATALOG.find(
    (p) =>
      p.hormoneCategory === med.hormone_category &&
      p.deliveryMethod === med.delivery_method &&
      (p.name.toLowerCase() === med.medication_name.toLowerCase() ||
        p.brandNames.some((b) => b.toLowerCase() === med.medication_name.toLowerCase())),
  );
}
