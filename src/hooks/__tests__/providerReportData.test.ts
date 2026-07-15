import { describe, expect, it, vi } from 'vitest';
import {
  createFreshProviderReportBlob,
  loadProviderReportSnapshot,
  ProviderReportDataLoadError,
  PROVIDER_REPORT_LOAD_ERROR_MESSAGE,
  type ProviderReportDataSource,
  type ProviderReportSnapshot,
  type ProviderReportSupabaseClient,
  type ProviderReportQueryBuilder,
} from '../providerReportData';
import type {
  ExtendedSymptomLog,
  LabResult,
  Medication,
  MedicationChange,
  Profile,
  QuickLogEvent,
  SymptomCheckin,
} from '../../types/database';
import type { DateRange } from '../../stores/dashboardStore';
import type { ProviderReportData } from '../../utils/pdfReport';

type SupabaseQueryResult = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

type TableConfig = {
  data?: unknown;
  error?: { code?: string; message: string } | null;
};

type QueryRecord = {
  table: string;
  select: string;
  eqColumn: string;
  eqValue: string;
  orders: Array<{ column: string; ascending: boolean }>;
  limit?: number;
};

const USER_ID = 'user-test-123';

const ALL_SOURCES: ProviderReportDataSource[] = [
  'symptom_checkins',
  'medications',
  'medication_changes',
  'lab_results',
  'quick_log_events',
  'extended_symptom_logs',
  'user_symptom_selections',
];

function makeCheckin(id: string, checkinDate: string): SymptomCheckin {
  return { id, user_id: USER_ID, checkin_date: checkinDate } as SymptomCheckin;
}

function makeMedication(id: string, isActive: boolean, startDate: string): Medication {
  return {
    id,
    user_id: USER_ID,
    is_active: isActive,
    start_date: startDate,
  } as Medication;
}

function makeMedicationChange(id: string, changeDate: string, createdAt: string): MedicationChange {
  return {
    id,
    user_id: USER_ID,
    change_date: changeDate,
    created_at: createdAt,
  } as MedicationChange;
}

function makeLabResult(id: string, drawDate: string): LabResult {
  return { id, user_id: USER_ID, draw_date: drawDate } as LabResult;
}

function makeQuickLogEvent(id: string, loggedAt: string): QuickLogEvent {
  return { id, user_id: USER_ID, logged_at: loggedAt } as QuickLogEvent;
}

function makeExtendedLog(id: string): ExtendedSymptomLog {
  return { id, user_id: USER_ID, symptom_key: 'brain_fog' } as ExtendedSymptomLog;
}

function createMockSupabase(
  tableConfigs: Record<string, TableConfig>,
  onQuery?: (record: QueryRecord) => void,
): ProviderReportSupabaseClient {
  const createBuilder = (table: string) => {
    const record: QueryRecord = {
      table,
      select: '',
      eqColumn: '',
      eqValue: '',
      orders: [],
    };

    const resolve = (): SupabaseQueryResult => {
      onQuery?.({ ...record });
      const config = tableConfigs[table] ?? { data: [], error: null };
      return {
        data: config.data ?? [],
        error: config.error ?? null,
      };
    };

    const builder: ProviderReportQueryBuilder = {
      select(columns: string) {
        record.select = columns;
        return builder;
      },
      eq(column: string, value: string) {
        record.eqColumn = column;
        record.eqValue = value;
        return builder;
      },
      order(column: string, options: { ascending: boolean }) {
        record.orders.push({ column, ascending: options.ascending });
        return builder;
      },
      limit(count: number) {
        record.limit = count;
        return Promise.resolve(resolve());
      },
      then<TResult1 = SupabaseQueryResult, TResult2 = never>(
        onfulfilled?: ((value: SupabaseQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(resolve()).then(onfulfilled, onrejected);
      },
    };

    return builder;
  };

  return { from: createBuilder } as ProviderReportSupabaseClient;
}

function populatedTableConfigs(): Record<string, TableConfig> {
  return {
    symptom_checkins: {
      data: [makeCheckin('checkin-1', '2026-07-01')],
    },
    medications: {
      data: [makeMedication('med-1', true, '2026-06-01')],
    },
    medication_changes: {
      data: [makeMedicationChange('change-1', '2026-06-15', '2026-06-15T10:00:00Z')],
    },
    lab_results: {
      data: [makeLabResult('lab-1', '2026-05-01')],
    },
    quick_log_events: {
      data: [makeQuickLogEvent('quick-1', '2026-07-02T08:00:00Z')],
    },
    extended_symptom_logs: {
      data: [makeExtendedLog('ext-1')],
    },
    user_symptom_selections: {
      data: [
        { symptom_id: 'hot_flashes', is_watch_symptom: true },
        { symptom_id: 'brain_fog', is_watch_symptom: false },
      ],
    },
  };
}

function makeProfile(): Profile {
  return {
    id: USER_ID,
    display_name: 'Test Patient',
    timezone: 'America/Los_Angeles',
  } as Profile;
}

function makeDateRange(): DateRange {
  return { start: '2026-01-01', end: '2026-12-31' };
}

describe('loadProviderReportSnapshot', () => {
  it('maps all seven successful query results to snapshot fields', async () => {
    const configs = populatedTableConfigs();
    const snapshot = await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase(configs),
    });

    expect(snapshot.checkins).toEqual(configs.symptom_checkins.data);
    expect(snapshot.medications).toEqual(configs.medications.data);
    expect(snapshot.medicationChanges).toEqual(configs.medication_changes.data);
    expect(snapshot.labResults).toEqual(configs.lab_results.data);
    expect(snapshot.quickLogEvents).toEqual(configs.quick_log_events.data);
    expect(snapshot.extendedSymptomLogs).toEqual(configs.extended_symptom_logs.data);
    expect(snapshot.trackedSymptomIds).toEqual(['hot_flashes', 'brain_fog']);
    expect(snapshot.watchSymptomIds).toEqual(['hot_flashes']);
  });

  it('scopes every query to the supplied user ID', async () => {
    const queries: QueryRecord[] = [];
    await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase(populatedTableConfigs(), (record) => queries.push(record)),
    });

    expect(queries).toHaveLength(7);
    for (const query of queries) {
      expect(query.eqColumn).toBe('user_id');
      expect(query.eqValue).toBe(USER_ID);
    }
  });

  it('preserves the 200-row check-in limit', async () => {
    const queries: QueryRecord[] = [];
    await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase(populatedTableConfigs(), (record) => queries.push(record)),
    });

    const checkinQuery = queries.find((query) => query.table === 'symptom_checkins');
    expect(checkinQuery?.limit).toBe(200);
  });

  it('preserves the 500-row quick-log limit', async () => {
    const queries: QueryRecord[] = [];
    await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase(populatedTableConfigs(), (record) => queries.push(record)),
    });

    const quickLogQuery = queries.find((query) => query.table === 'quick_log_events');
    expect(quickLogQuery?.limit).toBe(500);
  });

  it('uses required ordering for medications, changes, labs, check-ins, and quick logs', async () => {
    const queries: QueryRecord[] = [];
    await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase(populatedTableConfigs(), (record) => queries.push(record)),
    });

    expect(queries.find((query) => query.table === 'symptom_checkins')?.orders).toEqual([
      { column: 'checkin_date', ascending: false },
    ]);
    expect(queries.find((query) => query.table === 'medications')?.orders).toEqual([
      { column: 'is_active', ascending: false },
      { column: 'start_date', ascending: false },
    ]);
    expect(queries.find((query) => query.table === 'medication_changes')?.orders).toEqual([
      { column: 'change_date', ascending: false },
      { column: 'created_at', ascending: false },
    ]);
    expect(queries.find((query) => query.table === 'lab_results')?.orders).toEqual([
      { column: 'draw_date', ascending: false },
    ]);
    expect(queries.find((query) => query.table === 'quick_log_events')?.orders).toEqual([
      { column: 'logged_at', ascending: false },
    ]);
  });

  it('derives trackedSymptomIds from every selection row', async () => {
    const snapshot = await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase({
        ...populatedTableConfigs(),
        user_symptom_selections: {
          data: [
            { symptom_id: 'a', is_watch_symptom: false },
            { symptom_id: 'b', is_watch_symptom: true },
            { symptom_id: 'c', is_watch_symptom: false },
          ],
        },
      }),
    });

    expect(snapshot.trackedSymptomIds).toEqual(['a', 'b', 'c']);
  });

  it('derives watchSymptomIds only from watch selections', async () => {
    const snapshot = await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase({
        ...populatedTableConfigs(),
        user_symptom_selections: {
          data: [
            { symptom_id: 'a', is_watch_symptom: false },
            { symptom_id: 'b', is_watch_symptom: true },
            { symptom_id: 'c', is_watch_symptom: true },
          ],
        },
      }),
    });

    expect(snapshot.watchSymptomIds).toEqual(['b', 'c']);
  });

  it('normalizes successful null data to empty arrays', async () => {
    const snapshot = await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase({
        symptom_checkins: { data: null },
        medications: { data: null },
        medication_changes: { data: null },
        lab_results: { data: null },
        quick_log_events: { data: null },
        extended_symptom_logs: { data: null },
        user_symptom_selections: { data: null },
      }),
    });

    expect(snapshot.checkins).toEqual([]);
    expect(snapshot.medications).toEqual([]);
    expect(snapshot.medicationChanges).toEqual([]);
    expect(snapshot.labResults).toEqual([]);
    expect(snapshot.quickLogEvents).toEqual([]);
    expect(snapshot.extendedSymptomLogs).toEqual([]);
    expect(snapshot.trackedSymptomIds).toEqual([]);
    expect(snapshot.watchSymptomIds).toEqual([]);
  });

  it('returns a valid empty snapshot when all datasets are empty', async () => {
    const snapshot = await loadProviderReportSnapshot(USER_ID, {
      supabaseClient: createMockSupabase({
        symptom_checkins: { data: [] },
        medications: { data: [] },
        medication_changes: { data: [] },
        lab_results: { data: [] },
        quick_log_events: { data: [] },
        extended_symptom_logs: { data: [] },
        user_symptom_selections: { data: [] },
      }),
    });

    expect(snapshot).toEqual({
      checkins: [],
      medications: [],
      medicationChanges: [],
      labResults: [],
      quickLogEvents: [],
      extendedSymptomLogs: [],
      trackedSymptomIds: [],
      watchSymptomIds: [],
    });
  });
});

describe('loadProviderReportSnapshot failures', () => {
  it.each(ALL_SOURCES)(
    'rejects with ProviderReportDataLoadError when %s fails',
    async (failedSource) => {
      const configs = populatedTableConfigs();
      configs[failedSource] = {
        data: null,
        error: { code: 'PGRST500', message: `${failedSource} read failed` },
      };

      await expect(
        loadProviderReportSnapshot(USER_ID, {
          supabaseClient: createMockSupabase(configs),
        }),
      ).rejects.toMatchObject({
        name: 'ProviderReportDataLoadError',
        failedSources: [failedSource],
        message: PROVIDER_REPORT_LOAD_ERROR_MESSAGE,
      });

      try {
        await loadProviderReportSnapshot(USER_ID, {
          supabaseClient: createMockSupabase(configs),
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderReportDataLoadError);
        const loadError = error as ProviderReportDataLoadError;
        expect(loadError.failedSources).toEqual([failedSource]);
        expect(JSON.stringify(loadError)).not.toContain('checkin-1');
        expect(JSON.stringify(loadError)).not.toContain('med-1');
        expect(JSON.stringify(loadError)).not.toContain('lab-1');
        expect(JSON.stringify(loadError)).not.toContain('hot_flashes');
      }
    },
  );

  it('retains both failed source names when two queries fail simultaneously', async () => {
    const configs = populatedTableConfigs();
    configs.lab_results = { data: null, error: { code: 'PGRST500', message: 'lab failed' } };
    configs.quick_log_events = {
      data: null,
      error: { code: 'PGRST500', message: 'quick log failed' },
    };

    await expect(
      loadProviderReportSnapshot(USER_ID, {
        supabaseClient: createMockSupabase(configs),
      }),
    ).rejects.toMatchObject({
      name: 'ProviderReportDataLoadError',
      failedSources: expect.arrayContaining(['lab_results', 'quick_log_events']),
    });

    try {
      await loadProviderReportSnapshot(USER_ID, {
        supabaseClient: createMockSupabase(configs),
      });
    } catch (error) {
      const loadError = error as ProviderReportDataLoadError;
      expect(loadError.failedSources).toHaveLength(2);
      expect(loadError.failedSources).toContain('lab_results');
      expect(loadError.failedSources).toContain('quick_log_events');
    }
  });
});

describe('createFreshProviderReportBlob', () => {
  it('loads once and passes fresh snapshot arrays to the PDF generator on first call', async () => {
    const profile = makeProfile();
    const dateRange = makeDateRange();
    const timezone = 'America/Los_Angeles';
    const snapshot: ProviderReportSnapshot = {
      checkins: [makeCheckin('fresh-checkin', '2026-07-03')],
      medications: [makeMedication('fresh-med', true, '2026-07-01')],
      medicationChanges: [makeMedicationChange('fresh-change', '2026-07-02', '2026-07-02T12:00:00Z')],
      labResults: [makeLabResult('fresh-lab', '2026-07-04')],
      quickLogEvents: [makeQuickLogEvent('fresh-quick', '2026-07-05T09:00:00Z')],
      extendedSymptomLogs: [makeExtendedLog('fresh-ext')],
      trackedSymptomIds: ['fresh-tracked'],
      watchSymptomIds: ['fresh-watch'],
    };

    const loader = vi.fn(async () => snapshot);
    const expectedBlob = new Blob(['pdf'], { type: 'application/pdf' });
    const generateReport = vi.fn(async (_data: ProviderReportData) => expectedBlob);

    const blob = await createFreshProviderReportBlob(
      {
        userId: USER_ID,
        profile,
        dateRange,
        timezone,
        includeSafeguarding: true,
      },
      { loadSnapshot: loader, generateReport },
    );

    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith(USER_ID);
    expect(generateReport).toHaveBeenCalledTimes(1);
    expect(generateReport).toHaveBeenCalledWith({
      profile,
      medications: snapshot.medications,
      medicationChanges: snapshot.medicationChanges,
      checkins: snapshot.checkins,
      labResults: snapshot.labResults,
      extendedSymptomLogs: snapshot.extendedSymptomLogs,
      quickLogEvents: snapshot.quickLogEvents,
      trackedSymptomIds: snapshot.trackedSymptomIds,
      watchSymptomIds: snapshot.watchSymptomIds,
      dateRange,
      timezone,
      includeSafeguarding: true,
    });
    expect(blob).toBe(expectedBlob);
  });

  it('reloads fresh snapshot data on each invocation without reusing prior arrays', async () => {
    const profile = makeProfile();
    const dateRange = makeDateRange();
    const snapshotA: ProviderReportSnapshot = {
      checkins: [makeCheckin('a-checkin', '2026-01-01')],
      medications: [makeMedication('a-med', true, '2026-01-01')],
      medicationChanges: [],
      labResults: [],
      quickLogEvents: [],
      extendedSymptomLogs: [],
      trackedSymptomIds: ['a-tracked'],
      watchSymptomIds: [],
    };
    const snapshotB: ProviderReportSnapshot = {
      checkins: [makeCheckin('b-checkin', '2026-02-01')],
      medications: [makeMedication('b-med', false, '2026-02-01')],
      medicationChanges: [],
      labResults: [],
      quickLogEvents: [],
      extendedSymptomLogs: [],
      trackedSymptomIds: ['b-tracked'],
      watchSymptomIds: ['b-watch'],
    };

    const loader = vi
      .fn()
      .mockResolvedValueOnce(snapshotA)
      .mockResolvedValueOnce(snapshotB);
    const generateReport = vi.fn<(data: ProviderReportData) => Promise<Blob>>(
      async () => new Blob(['pdf'], { type: 'application/pdf' }),
    );

    const params = {
      userId: USER_ID,
      profile,
      dateRange,
      timezone: 'America/Los_Angeles',
      includeSafeguarding: false,
    };

    await createFreshProviderReportBlob(params, { loadSnapshot: loader, generateReport });
    await createFreshProviderReportBlob(params, { loadSnapshot: loader, generateReport });

    expect(loader).toHaveBeenCalledTimes(2);
    expect(generateReport).toHaveBeenCalledTimes(2);

    const calls = generateReport.mock.calls;
    expect(calls).toHaveLength(2);
    const secondCall = calls[1]![0]!;
    expect(secondCall.checkins).toBe(snapshotB.checkins);
    expect(secondCall.medications).toBe(snapshotB.medications);
    expect(secondCall.trackedSymptomIds).toBe(snapshotB.trackedSymptomIds);
    expect(secondCall.watchSymptomIds).toBe(snapshotB.watchSymptomIds);
    expect(secondCall.checkins).not.toBe(snapshotA.checkins);
    expect(secondCall.medications).not.toBe(snapshotA.medications);
    expect(secondCall.trackedSymptomIds).not.toContain('a-tracked');
  });

  it('does not call the PDF generator when snapshot loading fails', async () => {
    const loader = vi.fn(async () => {
      throw new ProviderReportDataLoadError(['symptom_checkins'], [
        { source: 'symptom_checkins', code: 'PGRST500', message: 'failed' },
      ]);
    });
    const generateReport = vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' }));

    await expect(
      createFreshProviderReportBlob(
        {
          userId: USER_ID,
          profile: makeProfile(),
          dateRange: makeDateRange(),
          timezone: 'America/Los_Angeles',
          includeSafeguarding: false,
        },
        { loadSnapshot: loader, generateReport },
      ),
    ).rejects.toBeInstanceOf(ProviderReportDataLoadError);

    expect(generateReport).not.toHaveBeenCalled();
  });
});
