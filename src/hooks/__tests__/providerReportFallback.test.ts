import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  loadProviderReportSnapshot,
  loadProviderReportSnapshotFromTables,
  ProviderReportDataLoadError,
  type ProviderReportSnapshot,
  type ProviderReportTableClient,
  type ProviderReportTableQuery,
} from '../providerReportData';
import type { DateRange } from '../../stores/dashboardStore';

const RANGE: DateRange = { start: '2026-04-01', end: '2026-07-25' };
const ZONE = 'America/New_York';
const USER_ID = 'user-1';

interface RecordedFilter {
  op: string;
  column: string;
  value: unknown;
}

type TableFixture = Record<string, { data?: unknown; error?: { code?: string; message: string } }>;

/** Minimal stand-in for the PostgREST builder: chainable, thenable, and records its filters. */
function makeTableClient(fixtures: TableFixture): {
  client: ProviderReportTableClient;
  filtersFor: (table: string) => RecordedFilter[];
} {
  const recorded = new Map<string, RecordedFilter[]>();

  const client: ProviderReportTableClient = {
    from(table: string) {
      const filters: RecordedFilter[] = [];
      recorded.set(table, filters);
      const fixture = fixtures[table] ?? { data: [] };
      const result = { data: fixture.data ?? [], error: fixture.error ?? null };

      const builder: ProviderReportTableQuery = {
        select() {
          return builder;
        },
        eq(column, value) {
          filters.push({ op: 'eq', column, value });
          return builder;
        },
        gte(column, value) {
          filters.push({ op: 'gte', column, value });
          return builder;
        },
        lte(column, value) {
          filters.push({ op: 'lte', column, value });
          return builder;
        },
        order(column, options) {
          filters.push({ op: 'order', column, value: options });
          return builder;
        },
        then(onfulfilled) {
          return Promise.resolve(result).then(onfulfilled);
        },
      };
      return builder;
    },
  };

  return { client, filtersFor: (table) => recorded.get(table) ?? [] };
}

const EMPTY_SNAPSHOT: ProviderReportSnapshot = {
  checkins: [],
  medications: [],
  medicationChanges: [],
  labResults: [],
  quickLogEvents: [],
  extendedSymptomLogs: [],
  administrations: [],
};

describe('loadProviderReportSnapshotFromTables', () => {
  it('scopes every table to the user and the selected range', async () => {
    const { client, filtersFor } = makeTableClient({});

    await loadProviderReportSnapshotFromTables(USER_ID, RANGE, ZONE, { tableClient: client });

    expect(filtersFor('symptom_checkins')).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'user_id', value: USER_ID },
        { op: 'gte', column: 'checkin_date', value: RANGE.start },
        { op: 'lte', column: 'checkin_date', value: RANGE.end },
      ]),
    );
    expect(filtersFor('lab_results')).toEqual(
      expect.arrayContaining([
        { op: 'gte', column: 'draw_date', value: RANGE.start },
        { op: 'lte', column: 'draw_date', value: RANGE.end },
      ]),
    );
    expect(filtersFor('medication_changes')).toEqual(
      expect.arrayContaining([{ op: 'gte', column: 'change_date', value: RANGE.start }]),
    );
    expect(filtersFor('medication_administrations')).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'user_id', value: USER_ID },
        { op: 'gte', column: 'taken_at', value: '2026-03-31T00:00:00.000Z' },
        { op: 'lte', column: 'taken_at', value: '2026-07-26T23:59:59.999Z' },
      ]),
    );
  });

  it('narrows padded administrations to the range by taken_at in the report timezone', async () => {
    const { client } = makeTableClient({
      medication_administrations: {
        data: [
          // 8pm Jul 25 in New York — keep.
          { id: 'in-range', taken_at: '2026-07-26T00:00:00Z', medication_id: 'med-1' },
          // Local date Jul 26 — outside RANGE.end.
          { id: 'out-of-range', taken_at: '2026-07-27T00:00:00Z', medication_id: 'med-1' },
        ],
      },
    });

    const snapshot = await loadProviderReportSnapshotFromTables(USER_ID, RANGE, ZONE, {
      tableClient: client,
    });

    expect(snapshot.administrations.map((a) => a.id)).toEqual(['in-range']);
  });

  it('pads the timestamp window so a late-evening local log is not dropped', async () => {
    const { client, filtersFor } = makeTableClient({});

    await loadProviderReportSnapshotFromTables(USER_ID, RANGE, ZONE, { tableClient: client });

    expect(filtersFor('quick_log_events')).toEqual(
      expect.arrayContaining([
        { op: 'gte', column: 'logged_at', value: '2026-03-31T00:00:00.000Z' },
        { op: 'lte', column: 'logged_at', value: '2026-07-26T23:59:59.999Z' },
      ]),
    );
  });

  it('narrows padded quick logs back to the range by their event-local date', async () => {
    const { client } = makeTableClient({
      quick_log_events: {
        data: [
          // 8pm on Jul 25 in New York is already Jul 26 in UTC — it must be kept.
          {
            id: 'in-range',
            logged_at: '2026-07-26T00:00:00Z',
            local_date: '2026-07-25',
            event_timezone: ZONE,
          },
          // Genuinely outside the window.
          {
            id: 'out-of-range',
            logged_at: '2026-07-27T00:00:00Z',
            local_date: '2026-07-26',
            event_timezone: ZONE,
          },
        ],
      },
    });

    const snapshot = await loadProviderReportSnapshotFromTables(USER_ID, RANGE, ZONE, {
      tableClient: client,
    });

    expect(snapshot.quickLogEvents.map((e) => e.id)).toEqual(['in-range']);
  });

  it('keeps only medications whose course overlaps the window, active ones first', async () => {
    const { client } = makeTableClient({
      medications: {
        data: [
          { id: 'ended-before', is_active: false, start_date: '2026-01-01', end_date: '2026-02-01' },
          { id: 'open', is_active: true, start_date: '2026-05-01', end_date: null },
          { id: 'overlaps', is_active: false, start_date: '2026-03-01', end_date: '2026-05-01' },
        ],
      },
    });

    const snapshot = await loadProviderReportSnapshotFromTables(USER_ID, RANGE, ZONE, {
      tableClient: client,
    });

    expect(snapshot.medications.map((m) => m.id)).toEqual(['open', 'overlaps']);
  });

  it('keeps only extended symptoms belonging to check-ins inside the range', async () => {
    const { client } = makeTableClient({
      symptom_checkins: { data: [{ id: 'checkin-in', checkin_date: '2026-05-01' }] },
      extended_symptom_logs: {
        data: [
          { id: 'kept', checkin_id: 'checkin-in' },
          { id: 'dropped', checkin_id: 'checkin-outside' },
        ],
      },
    });

    const snapshot = await loadProviderReportSnapshotFromTables(USER_ID, RANGE, ZONE, {
      tableClient: client,
    });

    expect(snapshot.extendedSymptomLogs.map((l) => l.id)).toEqual(['kept']);
  });

  it('fails the whole report rather than emitting a partial one', async () => {
    const { client } = makeTableClient({
      lab_results: { error: { code: '42P01', message: 'relation does not exist' } },
    });

    await expect(
      loadProviderReportSnapshotFromTables(USER_ID, RANGE, ZONE, { tableClient: client }),
    ).rejects.toBeInstanceOf(ProviderReportDataLoadError);
  });

  it('rejects a reversed range before touching the database', async () => {
    const { client, filtersFor } = makeTableClient({});

    await expect(
      loadProviderReportSnapshotFromTables(
        USER_ID,
        { start: '2026-07-26', end: '2026-07-25' },
        ZONE,
        { tableClient: client },
      ),
    ).rejects.toThrow('start date');
    expect(filtersFor('symptom_checkins')).toEqual([]);
  });
});

describe('loadProviderReportSnapshot', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the RPC when it works and never touches the tables', async () => {
    const loadFromRpc = vi.fn(async () => EMPTY_SNAPSHOT);
    const loadFromTables = vi.fn(async () => EMPTY_SNAPSHOT);

    await loadProviderReportSnapshot(USER_ID, RANGE, ZONE, { loadFromRpc, loadFromTables });

    expect(loadFromRpc).toHaveBeenCalledOnce();
    expect(loadFromTables).not.toHaveBeenCalled();
  });

  it.each([
    ['PGRST202', 'Could not find the function public.get_provider_report_snapshot'],
    ['42883', 'function does not exist'],
    ['42501', 'permission denied for function'],
  ])('rebuilds from tables when the RPC is missing (%s)', async (code, message) => {
    const loadFromRpc = vi.fn(async () => {
      throw new ProviderReportDataLoadError(
        ['provider_report_snapshot'],
        [{ source: 'provider_report_snapshot', code, message }],
      );
    });
    const loadFromTables = vi.fn(async () => EMPTY_SNAPSHOT);

    const snapshot = await loadProviderReportSnapshot(USER_ID, RANGE, ZONE, {
      loadFromRpc,
      loadFromTables,
    });

    expect(loadFromTables).toHaveBeenCalledWith(USER_ID, RANGE, ZONE);
    expect(snapshot).toBe(EMPTY_SNAPSHOT);
  });

  it('rebuilds from tables when the RPC guard silently returns no rows', async () => {
    const loadFromRpc = vi.fn(async () => {
      throw new ProviderReportDataLoadError(
        ['provider_report_snapshot'],
        [{ source: 'provider_report_snapshot', message: 'The report snapshot returned no rows' }],
      );
    });
    const loadFromTables = vi.fn(async () => EMPTY_SNAPSHOT);

    await loadProviderReportSnapshot(USER_ID, RANGE, ZONE, { loadFromRpc, loadFromTables });

    expect(loadFromTables).toHaveBeenCalledOnce();
  });

  it('still falls back when the RPC fails for an unrecognised reason', async () => {
    const loadFromRpc = vi.fn(async () => {
      throw new ProviderReportDataLoadError(
        ['provider_report_snapshot'],
        [{ source: 'provider_report_snapshot', code: 'XX000', message: 'internal error' }],
      );
    });
    const loadFromTables = vi.fn(async () => EMPTY_SNAPSHOT);

    await loadProviderReportSnapshot(USER_ID, RANGE, ZONE, { loadFromRpc, loadFromTables });

    expect(loadFromTables).toHaveBeenCalledOnce();
  });

  it('reports both causes when neither path works', async () => {
    const loadFromRpc = vi.fn(async () => {
      throw new ProviderReportDataLoadError(
        ['provider_report_snapshot'],
        [{ source: 'provider_report_snapshot', code: 'PGRST202', message: 'missing function' }],
      );
    });
    const loadFromTables = vi.fn(async () => {
      throw new ProviderReportDataLoadError(
        ['lab_results'],
        [{ source: 'lab_results', code: '42501', message: 'permission denied' }],
      );
    });

    let error: unknown;
    try {
      await loadProviderReportSnapshot(USER_ID, RANGE, ZONE, { loadFromRpc, loadFromTables });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ProviderReportDataLoadError);
    if (!(error instanceof ProviderReportDataLoadError)) throw new Error('unreachable');
    expect(error.failedSources).toEqual(['provider_report_snapshot', 'lab_results']);
    expect(error.technicalDetail).toContain('provider_report_snapshot [PGRST202]');
    expect(error.technicalDetail).toContain('lab_results [42501]');
  });

  it('does not swallow a programming error such as a reversed range', async () => {
    const loadFromRpc = vi.fn(async () => {
      throw new Error('Provider report start date must be on or before its end date.');
    });
    const loadFromTables = vi.fn(async () => EMPTY_SNAPSHOT);

    await expect(
      loadProviderReportSnapshot(USER_ID, RANGE, ZONE, { loadFromRpc, loadFromTables }),
    ).rejects.toThrow('start date');
    expect(loadFromTables).not.toHaveBeenCalled();
  });
});
