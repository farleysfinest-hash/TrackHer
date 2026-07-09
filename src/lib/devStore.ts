import type {
  Medication,
  MedicationChange,
  SymptomCheckin,
  ExtendedSymptomLog,
  LabResult,
  UserSymptomSelection,
  QuickLogEvent,
} from '../types/database';
import {
  MOCK_MEDICATIONS,
  MOCK_MEDICATION_CHANGES,
  MOCK_CHECKINS,
  MOCK_LAB_RESULTS,
  MOCK_QUICK_LOGS,
} from './mockData';

/** Shared in-memory state so all hook instances stay in sync in dev mode. */
let medications: Medication[] = [...MOCK_MEDICATIONS];
let medicationChanges: MedicationChange[] = [...MOCK_MEDICATION_CHANGES];
let checkins: SymptomCheckin[] = [...MOCK_CHECKINS];
let extendedSymptomLogs: ExtendedSymptomLog[] = [];
let labResults: LabResult[] = [...MOCK_LAB_RESULTS];
let symptomSelections: Omit<UserSymptomSelection, 'id' | 'selected_at'>[] = [];
let quickLogs: QuickLogEvent[] = [...MOCK_QUICK_LOGS];
let dismissedInsights: { insight_id: string; dismissed_at: string }[] = [];

export function resetDevStore(): void {
  medications = [...MOCK_MEDICATIONS];
  medicationChanges = [...MOCK_MEDICATION_CHANGES];
  checkins = [...MOCK_CHECKINS];
  extendedSymptomLogs = [];
  labResults = [...MOCK_LAB_RESULTS];
  symptomSelections = [];
  quickLogs = [...MOCK_QUICK_LOGS];
  dismissedInsights = [];
  console.log('[DEV] Store reset to initial mock data');
}

export function getDevMedications(): Medication[] {
  return medications;
}

export function setDevMedications(meds: Medication[]): void {
  medications = meds;
}

export function getDevMedicationChanges(): MedicationChange[] {
  return medicationChanges;
}

export function setDevMedicationChanges(changes: MedicationChange[]): void {
  medicationChanges = changes;
}

export function getDevCheckins(): SymptomCheckin[] {
  return checkins;
}

export function setDevCheckins(data: SymptomCheckin[]): void {
  checkins = data;
}

export function getDevExtendedSymptomLogs(): ExtendedSymptomLog[] {
  return extendedSymptomLogs;
}

export function setDevExtendedSymptomLogs(logs: ExtendedSymptomLog[]): void {
  extendedSymptomLogs = logs;
}

export function getDevLabResults(): LabResult[] {
  return labResults;
}

export function setDevLabResults(data: LabResult[]): void {
  labResults = data;
}

export function getDevSymptomSelections(): Omit<UserSymptomSelection, 'id' | 'selected_at'>[] {
  return symptomSelections;
}

export function setDevSymptomSelections(
  selections: Omit<UserSymptomSelection, 'id' | 'selected_at'>[],
): void {
  symptomSelections = selections;
}

export function getDevQuickLogs(): QuickLogEvent[] {
  return quickLogs;
}

export function setDevQuickLogs(events: QuickLogEvent[]): void {
  quickLogs = events;
}

export function getDevDismissedInsights(): { insight_id: string; dismissed_at: string }[] {
  return dismissedInsights;
}

export function addDevDismissedInsight(insightId: string, dismissedAt: string): void {
  dismissedInsights = [
    ...dismissedInsights.filter((d) => d.insight_id !== insightId),
    { insight_id: insightId, dismissed_at: dismissedAt },
  ];
}

export function resetDevDismissedInsights(): void {
  dismissedInsights = [];
}
