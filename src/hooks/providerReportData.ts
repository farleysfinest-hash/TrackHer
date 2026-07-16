import { supabase } from '../lib/supabase';
import { generateProviderReport } from '../utils/pdfReport';
import type {
  ExtendedSymptomLog,
  LabResult,
  Medication,
  MedicationChange,
  Profile,
  QuickLogEvent,
  SymptomCheckin,
} from '../types/database';
import type { DateRange } from '../stores/dashboardStore';
import type { ProviderReportData } from '../utils/pdfReport';
import { daysBetweenISO } from '../utils/localDate';

export interface ProviderReportSnapshot {
  checkins: SymptomCheckin[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  labResults: LabResult[];
  quickLogEvents: QuickLogEvent[];
  extendedSymptomLogs: ExtendedSymptomLog[];
}

export type ProviderReportDataSource =
  | 'provider_report_snapshot'
  | 'symptom_checkins'
  | 'medications'
  | 'medication_changes'
  | 'lab_results'
  | 'quick_log_events'
  | 'extended_symptom_logs';

export const PROVIDER_REPORT_LOAD_ERROR_MESSAGE =
  'We couldn’t load all of the data needed for your provider report. No report was downloaded. Please try again.';

export class ProviderReportDataLoadError extends Error {
  readonly failedSources: ProviderReportDataSource[];
  readonly sourceErrors: Array<{
    source: ProviderReportDataSource;
    code?: string;
    message: string;
  }>;

  constructor(
    failedSources: ProviderReportDataSource[],
    sourceErrors: Array<{
      source: ProviderReportDataSource;
      code?: string;
      message: string;
    }>,
  ) {
    super(PROVIDER_REPORT_LOAD_ERROR_MESSAGE);
    this.name = 'ProviderReportDataLoadError';
    this.failedSources = failedSources;
    this.sourceErrors = sourceErrors;
  }
}

interface ProviderReportRpcPayload {
  checkins?: SymptomCheckin[];
  medications?: Medication[];
  medicationChanges?: MedicationChange[];
  labResults?: LabResult[];
  quickLogEvents?: QuickLogEvent[];
  extendedSymptomLogs?: ExtendedSymptomLog[];
}

export interface ProviderReportRpcClient {
  rpc: (
    functionName: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
}

export async function loadProviderReportSnapshotFromRpc(
  _userId: string,
  dateRange: DateRange,
  timezone: string,
  deps: { rpcClient?: ProviderReportRpcClient } = {},
): Promise<ProviderReportSnapshot> {
  const rangeDays = daysBetweenISO(dateRange.start, dateRange.end) + 1;
  if (rangeDays < 1) {
    throw new Error('Provider report start date must be on or before its end date.');
  }

  const client = deps.rpcClient ?? (supabase as unknown as ProviderReportRpcClient);
  const { data, error } = await client.rpc('get_provider_report_snapshot', {
    p_start: dateRange.start,
    p_end: dateRange.end,
    p_timezone: timezone,
  });
  if (error || !data) {
    throw new ProviderReportDataLoadError(
      ['provider_report_snapshot'],
      [
        {
          source: 'provider_report_snapshot',
          code: error?.code,
          message: error?.message ?? 'The report snapshot was empty',
        },
      ],
    );
  }

  const payload = data as ProviderReportRpcPayload;
  return {
    checkins: payload.checkins ?? [],
    medications: payload.medications ?? [],
    medicationChanges: payload.medicationChanges ?? [],
    labResults: payload.labResults ?? [],
    quickLogEvents: payload.quickLogEvents ?? [],
    extendedSymptomLogs: payload.extendedSymptomLogs ?? [],
  };
}

export interface CreateFreshProviderReportBlobParams {
  userId: string;
  profile: Profile;
  dateRange: DateRange;
  timezone: string;
  includeSafeguarding: boolean;
}

export interface CreateFreshProviderReportBlobDependencies {
  loadSnapshot?: (
    userId: string,
    dateRange: DateRange,
    timezone: string,
  ) => Promise<ProviderReportSnapshot>;
  generateReport?: (data: ProviderReportData) => Promise<Blob>;
}

export async function createFreshProviderReportBlob(
  params: CreateFreshProviderReportBlobParams,
  deps: CreateFreshProviderReportBlobDependencies = {},
): Promise<Blob> {
  const loadSnapshot = deps.loadSnapshot ?? loadProviderReportSnapshotFromRpc;
  const generateReportFn = deps.generateReport ?? generateProviderReport;

  const snapshot = await loadSnapshot(params.userId, params.dateRange, params.timezone);

  return generateReportFn({
    profile: params.profile,
    medications: snapshot.medications,
    medicationChanges: snapshot.medicationChanges,
    checkins: snapshot.checkins,
    labResults: snapshot.labResults,
    extendedSymptomLogs: snapshot.extendedSymptomLogs,
    quickLogEvents: snapshot.quickLogEvents,
    dateRange: params.dateRange,
    timezone: params.timezone,
    includeSafeguarding: params.includeSafeguarding,
  });
}
