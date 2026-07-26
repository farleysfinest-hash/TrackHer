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
import { addDaysISO, daysBetweenISO, resolveEventLocalDate } from '../utils/localDate';

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

export interface ProviderReportSourceError {
  source: ProviderReportDataSource;
  code?: string;
  message: string;
}

export class ProviderReportDataLoadError extends Error {
  readonly failedSources: ProviderReportDataSource[];
  readonly sourceErrors: ProviderReportSourceError[];

  constructor(
    failedSources: ProviderReportDataSource[],
    sourceErrors: ProviderReportSourceError[],
  ) {
    super(PROVIDER_REPORT_LOAD_ERROR_MESSAGE);
    this.name = 'ProviderReportDataLoadError';
    this.failedSources = failedSources;
    this.sourceErrors = sourceErrors;
  }

  /**
   * Compact, screenshot-friendly cause. The friendly message alone leaves a failure
   * undiagnosable, which is how a broken snapshot path stays invisible.
   */
  get technicalDetail(): string {
    return this.sourceErrors
      .map((entry) => `${entry.source}${entry.code ? ` [${entry.code}]` : ''}: ${entry.message}`)
      .join('; ');
  }
}

/* ------------------------------------------------------------------ *
 * Snapshot RPC (fast path)
 * ------------------------------------------------------------------ */

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

/**
 * Errors that mean "this database has no usable snapshot function", as opposed to a genuine
 * query failure. Migrations are applied by hand, so a project can legitimately be missing it.
 */
const RPC_UNAVAILABLE_CODES = new Set([
  'PGRST202', // function not found in the PostgREST schema cache
  'PGRST203', // ambiguous overload
  '42883', // undefined_function
  '42501', // insufficient_privilege
  '404',
]);

function isRpcUnavailable(error: { code?: string; message: string } | null): boolean {
  if (!error) return false;
  if (error.code && RPC_UNAVAILABLE_CODES.has(error.code)) return true;
  return /could not find the function|does not exist|schema cache|no rows/i.test(error.message);
}

function assertUsableRange(dateRange: DateRange): void {
  if (daysBetweenISO(dateRange.start, dateRange.end) + 1 < 1) {
    throw new Error('Provider report start date must be on or before its end date.');
  }
}

export async function loadProviderReportSnapshotFromRpc(
  _userId: string,
  dateRange: DateRange,
  timezone: string,
  deps: { rpcClient?: ProviderReportRpcClient } = {},
): Promise<ProviderReportSnapshot> {
  assertUsableRange(dateRange);

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
          // A null payload with no error means the function's guard clause declined the call.
          message: error?.message ?? 'The report snapshot returned no rows',
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

/* ------------------------------------------------------------------ *
 * Direct table reads (fallback path)
 * ------------------------------------------------------------------ */

type SupabaseQueryResult = { data: unknown; error: { code?: string; message: string } | null };

export interface ProviderReportTableQuery extends PromiseLike<SupabaseQueryResult> {
  select(columns: string): ProviderReportTableQuery;
  eq(column: string, value: string): ProviderReportTableQuery;
  gte(column: string, value: string): ProviderReportTableQuery;
  lte(column: string, value: string): ProviderReportTableQuery;
  order(column: string, options: { ascending: boolean }): ProviderReportTableQuery;
}

export interface ProviderReportTableClient {
  from: (table: string) => ProviderReportTableQuery;
}

function rowsOf<T>(result: SupabaseQueryResult): T[] {
  return (result.data as T[] | null) ?? [];
}

/**
 * Rebuild the snapshot from the underlying tables.
 *
 * Every filter here is a plain range predicate or a client-side narrowing, so this works on any
 * project with the base schema — no RPC required. Row-level security still scopes each read to
 * the signed-in user; the `user_id` filter is an extra narrowing, not the security boundary.
 */
export async function loadProviderReportSnapshotFromTables(
  userId: string,
  dateRange: DateRange,
  timezone: string,
  deps: { tableClient?: ProviderReportTableClient } = {},
): Promise<ProviderReportSnapshot> {
  assertUsableRange(dateRange);

  const client = deps.tableClient ?? (supabase as unknown as ProviderReportTableClient);

  // Timestamped rows are padded a day either side, then narrowed by their event-local date below.
  // Something logged at 11pm local can sit on the neighbouring UTC day.
  const paddedStart = addDaysISO(dateRange.start, -1);
  const paddedEnd = addDaysISO(dateRange.end, 1);

  const [checkinsResult, medicationsResult, changesResult, labsResult, quickLogResult] =
    await Promise.all([
      client
        .from('symptom_checkins')
        .select('*')
        .eq('user_id', userId)
        .gte('checkin_date', dateRange.start)
        .lte('checkin_date', dateRange.end)
        .order('checkin_date', { ascending: false }),
      client
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .lte('start_date', dateRange.end)
        .order('start_date', { ascending: false }),
      client
        .from('medication_changes')
        .select('*')
        .eq('user_id', userId)
        .gte('change_date', dateRange.start)
        .lte('change_date', dateRange.end)
        .order('change_date', { ascending: false }),
      client
        .from('lab_results')
        .select('*')
        .eq('user_id', userId)
        .gte('draw_date', dateRange.start)
        .lte('draw_date', dateRange.end)
        .order('draw_date', { ascending: false }),
      client
        .from('quick_log_events')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', `${paddedStart}T00:00:00.000Z`)
        .lte('logged_at', `${paddedEnd}T23:59:59.999Z`)
        .order('logged_at', { ascending: false }),
    ]);

  // Extended symptoms hang off check-ins, so they are narrowed once the check-ins land.
  const extendedResult = await client
    .from('extended_symptom_logs')
    .select('*')
    .eq('user_id', userId);

  const attempts: Array<{ source: ProviderReportDataSource; result: SupabaseQueryResult }> = [
    { source: 'symptom_checkins', result: checkinsResult },
    { source: 'medications', result: medicationsResult },
    { source: 'medication_changes', result: changesResult },
    { source: 'lab_results', result: labsResult },
    { source: 'quick_log_events', result: quickLogResult },
    { source: 'extended_symptom_logs', result: extendedResult },
  ];

  const failed = attempts.filter(({ result }) => result.error != null);
  if (failed.length > 0) {
    const sourceErrors = failed.map(({ source, result }) => ({
      source,
      code: result.error?.code,
      message: result.error?.message ?? 'Unknown error',
    }));
    throw new ProviderReportDataLoadError(
      sourceErrors.map((entry) => entry.source),
      sourceErrors,
    );
  }

  const checkins = rowsOf<SymptomCheckin>(checkinsResult);
  const checkinIds = new Set(checkins.map((c) => c.id));

  const medications = rowsOf<Medication>(medicationsResult)
    // Keep anything whose course overlaps the window; an open course has no end date.
    .filter((m) => m.end_date === null || m.end_date >= dateRange.start)
    .sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return b.start_date.localeCompare(a.start_date);
    });

  const quickLogEvents = rowsOf<QuickLogEvent>(quickLogResult).filter((event) => {
    const localDate = resolveEventLocalDate(
      event.logged_at,
      event.local_date,
      event.event_timezone,
      timezone,
    );
    return localDate >= dateRange.start && localDate <= dateRange.end;
  });

  return {
    checkins,
    medications,
    medicationChanges: rowsOf<MedicationChange>(changesResult),
    labResults: rowsOf<LabResult>(labsResult),
    quickLogEvents,
    extendedSymptomLogs: rowsOf<ExtendedSymptomLog>(extendedResult).filter((log) =>
      checkinIds.has(log.checkin_id),
    ),
  };
}

/* ------------------------------------------------------------------ *
 * Combined loader
 * ------------------------------------------------------------------ */

export interface LoadProviderReportSnapshotDependencies {
  loadFromRpc?: (
    userId: string,
    dateRange: DateRange,
    timezone: string,
  ) => Promise<ProviderReportSnapshot>;
  loadFromTables?: (
    userId: string,
    dateRange: DateRange,
    timezone: string,
  ) => Promise<ProviderReportSnapshot>;
}

/**
 * Load the report snapshot, preferring the single-statement RPC and falling back to direct table
 * reads when that function is missing or declines the call.
 *
 * Migrations are applied by hand (docs/DEPLOYMENT.md), so the RPC's presence cannot be assumed.
 * The fallback keeps the report working on any project with the base schema; an error surfaces
 * only when both paths fail, and it carries both causes.
 */
export async function loadProviderReportSnapshot(
  userId: string,
  dateRange: DateRange,
  timezone: string,
  deps: LoadProviderReportSnapshotDependencies = {},
): Promise<ProviderReportSnapshot> {
  const loadFromRpc = deps.loadFromRpc ?? loadProviderReportSnapshotFromRpc;
  const loadFromTables = deps.loadFromTables ?? loadProviderReportSnapshotFromTables;

  try {
    return await loadFromRpc(userId, dateRange, timezone);
  } catch (rpcError) {
    if (!(rpcError instanceof ProviderReportDataLoadError)) throw rpcError;

    const rpcSourceError = rpcError.sourceErrors[0];
    const unavailable =
      rpcSourceError === undefined ||
      isRpcUnavailable({ code: rpcSourceError.code, message: rpcSourceError.message });

    console.warn(
      unavailable
        ? 'Provider report snapshot RPC unavailable; rebuilding from tables.'
        : 'Provider report snapshot RPC failed; retrying from tables.',
      rpcError.technicalDetail,
    );

    try {
      return await loadFromTables(userId, dateRange, timezone);
    } catch (tableError) {
      if (!(tableError instanceof ProviderReportDataLoadError)) throw tableError;

      const combined = new ProviderReportDataLoadError(
        [...rpcError.failedSources, ...tableError.failedSources],
        [...rpcError.sourceErrors, ...tableError.sourceErrors],
      );
      console.error('Provider report data load failed on every path', combined.technicalDetail);
      throw combined;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Blob assembly
 * ------------------------------------------------------------------ */

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
  const loadSnapshot = deps.loadSnapshot ?? loadProviderReportSnapshot;
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
