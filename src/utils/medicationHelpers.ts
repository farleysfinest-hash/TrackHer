import { MEDICATION_CATALOG } from '../data/medications';
import type { MedicationOption } from '../types/medications';
import type {
  HormoneCategory,
  DeliveryMethod,
  Medication,
  MedicationFrequency,
  MedicationChangeType,
} from '../types/database';
import { APPLICATION_SITE_LABELS } from '../lib/medicationConstants';

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
  return `${med.medication_name} ${med.dose_amount} ${med.dose_unit}`;
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
    estrogen: 'text-clay-500 bg-clay-500/10',
    progesterone: 'text-sage-600 bg-sage-600/10',
    testosterone: 'text-info bg-info/10',
    combination: 'text-sage-800 bg-sage-800/10',
    dhea: 'text-sand-400 bg-sand-400/10',
    oxytocin: 'text-clay-400 bg-clay-400/10',
    thyroid: 'text-sage-400 bg-sage-400/10',
    supplement: 'text-sand-300 bg-sand-300/10',
    other: 'text-sand-400 bg-sand-400/10',
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
  const date = new Date(insertionDate);
  date.setMonth(date.getMonth() + durationMonths);
  return date;
}

export function isPelletDueSoon(insertionDate: string, durationMonths: number): boolean {
  const replacementDate = getPelletReplacementDate(insertionDate, durationMonths);
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
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
      return 'bg-info';
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

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function findCatalogProductForMedication(med: Medication): MedicationOption | undefined {
  return MEDICATION_CATALOG.find(
    (p) =>
      p.hormoneCategory === med.hormone_category &&
      p.deliveryMethod === med.delivery_method &&
      (p.name.toLowerCase() === med.medication_name.toLowerCase() ||
        p.brandNames.some((b) => b.toLowerCase() === med.medication_name.toLowerCase())),
  );
}
