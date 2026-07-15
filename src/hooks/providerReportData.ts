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

export interface ProviderReportSnapshot {
  checkins: SymptomCheckin[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  labResults: LabResult[];
  quickLogEvents: QuickLogEvent[];
  extendedSymptomLogs: ExtendedSymptomLog[];
  trackedSymptomIds: string[];
  watchSymptomIds: string[];
}

export type ProviderReportDataSource =
  | 'symptom_checkins'
  | 'medications'
  | 'medication_changes'
  | 'lab_results'
  | 'quick_log_events'
  | 'extended_symptom_logs'
  | 'user_symptom_selections';

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

type SupabaseQueryResult = { data: unknown; error: { code?: string; message: string } | null };

export interface ProviderReportQueryBuilder extends PromiseLike<SupabaseQueryResult> {
  select(columns: string): ProviderReportQueryBuilder;
  eq(column: string, value: string): ProviderReportQueryBuilder;
  order(column: string, options: { ascending: boolean }): ProviderReportQueryBuilder;
  limit(count: number): PromiseLike<SupabaseQueryResult>;
}

export type ProviderReportSupabaseClient = {
  from: (table: string) => ProviderReportQueryBuilder;
};

export interface LoadProviderReportSnapshotDependencies {
  supabaseClient?: ProviderReportSupabaseClient;
}

function normalizeArray<T>(data: T[] | null | undefined): T[] {
  return data ?? [];
}

export async function loadProviderReportSnapshot(
  userId: string,
  deps: LoadProviderReportSnapshotDependencies = {},
): Promise<ProviderReportSnapshot> {
  const client = deps.supabaseClient ?? (supabase as unknown as ProviderReportSupabaseClient);

  const [
    checkinsResult,
    medicationsResult,
    medicationChangesResult,
    labResultsResult,
    quickLogEventsResult,
    extendedSymptomLogsResult,
    symptomSelectionsResult,
  ] = await Promise.all([
    client
      .from('symptom_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(200),
    client
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('start_date', { ascending: false }) as PromiseLike<SupabaseQueryResult>,
    client
      .from('medication_changes')
      .select('*')
      .eq('user_id', userId)
      .order('change_date', { ascending: false })
      .order('created_at', { ascending: false }) as PromiseLike<SupabaseQueryResult>,
    client
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('draw_date', { ascending: false }) as PromiseLike<SupabaseQueryResult>,
    client
      .from('quick_log_events')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(500),
    client.from('extended_symptom_logs').select('*').eq('user_id', userId) as PromiseLike<SupabaseQueryResult>,
    client
      .from('user_symptom_selections')
      .select('symptom_id, is_watch_symptom')
      .eq('user_id', userId) as PromiseLike<SupabaseQueryResult>,
  ]);

  const results: Array<{ source: ProviderReportDataSource; result: SupabaseQueryResult }> = [
    { source: 'symptom_checkins', result: checkinsResult },
    { source: 'medications', result: medicationsResult },
    { source: 'medication_changes', result: medicationChangesResult },
    { source: 'lab_results', result: labResultsResult },
    { source: 'quick_log_events', result: quickLogEventsResult },
    { source: 'extended_symptom_logs', result: extendedSymptomLogsResult },
    { source: 'user_symptom_selections', result: symptomSelectionsResult },
  ];

  const failed = results.filter(({ result }) => result.error != null);
  if (failed.length > 0) {
    const sourceErrors = failed.map(({ source, result }) => ({
      source,
      code: result.error?.code,
      message: result.error?.message ?? 'Unknown error',
    }));
    const failedSources = sourceErrors.map((entry) => entry.source);

    console.error('Provider report data load failed', {
      failedSources,
      errors: sourceErrors.map(({ source, code, message }) => ({ source, code, message })),
    });

    throw new ProviderReportDataLoadError(failedSources, sourceErrors);
  }

  const selections =
    (symptomSelectionsResult.data as Array<{
      symptom_id: string;
      is_watch_symptom: boolean;
    }> | null) ?? [];

  return {
    checkins: normalizeArray(checkinsResult.data as SymptomCheckin[] | null),
    medications: normalizeArray(medicationsResult.data as Medication[] | null),
    medicationChanges: normalizeArray(medicationChangesResult.data as MedicationChange[] | null),
    labResults: normalizeArray(labResultsResult.data as LabResult[] | null),
    quickLogEvents: normalizeArray(quickLogEventsResult.data as QuickLogEvent[] | null),
    extendedSymptomLogs: normalizeArray(
      extendedSymptomLogsResult.data as ExtendedSymptomLog[] | null,
    ),
    trackedSymptomIds: selections.map((row) => row.symptom_id),
    watchSymptomIds: selections
      .filter((row) => row.is_watch_symptom)
      .map((row) => row.symptom_id),
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
  loadSnapshot?: (userId: string) => Promise<ProviderReportSnapshot>;
  generateReport?: (data: ProviderReportData) => Promise<Blob>;
}

export async function createFreshProviderReportBlob(
  params: CreateFreshProviderReportBlobParams,
  deps: CreateFreshProviderReportBlobDependencies = {},
): Promise<Blob> {
  const loadSnapshot = deps.loadSnapshot ?? loadProviderReportSnapshot;
  const generateReportFn = deps.generateReport ?? generateProviderReport;

  const snapshot = await loadSnapshot(params.userId);

  return generateReportFn({
    profile: params.profile,
    medications: snapshot.medications,
    medicationChanges: snapshot.medicationChanges,
    checkins: snapshot.checkins,
    labResults: snapshot.labResults,
    extendedSymptomLogs: snapshot.extendedSymptomLogs,
    quickLogEvents: snapshot.quickLogEvents,
    trackedSymptomIds: snapshot.trackedSymptomIds,
    watchSymptomIds: snapshot.watchSymptomIds,
    dateRange: params.dateRange,
    timezone: params.timezone,
    includeSafeguarding: params.includeSafeguarding,
  });
}
