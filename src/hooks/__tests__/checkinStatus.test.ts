import { describe, expect, it } from 'vitest';
import {
  computeCheckinStatus,
  EMPTY_CHECKIN_STATUS,
  loadCheckinStatusSnapshot,
  type CheckinStatusSnapshot,
} from '../checkinStatus';
import type { MRSScore, SymptomCheckin } from '../../types/database';
import { MRS_CANONICAL_KEYS } from '../../utils/checkinHelpers';
import { addDaysISO } from '../../utils/localDate';

const USER_ID = 'user-checkin-status';
const TODAY = '2026-07-15'; // Wednesday

function makeFullMrsCheckin(
  checkinDate: string,
  overrides: Partial<SymptomCheckin> = {},
): SymptomCheckin {
  const baseScores = Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, 1 as MRSScore]));
  return {
    id: `full-${checkinDate}`,
    user_id: USER_ID,
    checkin_date: checkinDate,
    checkin_type: 'full',
    mrs_complete: true,
    total_score: 11,
    somatic_score: 3,
    psychological_score: 4,
    urogenital_score: 3,
    overall_wellbeing: 3,
    energy_level: 4,
    mood_level: 4,
    sleep_quality: 4,
    notes: null,
    is_backdated: false,
    created_at: `${checkinDate}T12:00:00Z`,
    ...baseScores,
    ...overrides,
  } as SymptomCheckin;
}

function makePulseCheckin(
  checkinDate: string,
  overrides: Partial<SymptomCheckin> = {},
): SymptomCheckin {
  const nullMrs = Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, null]));
  return makeFullMrsCheckin(checkinDate, {
    id: `pulse-${checkinDate}`,
    checkin_type: 'pulse',
    mrs_complete: false,
    total_score: 0,
    somatic_score: 0,
    psychological_score: 0,
    urogenital_score: 0,
    ...nullMrs,
    energy_level: 3,
    mood_level: 3,
    sleep_quality: 3,
    ...overrides,
  });
}

function makeIncompleteMrsCheckin(checkinDate: string): SymptomCheckin {
  const nullMrs = Object.fromEntries(MRS_CANONICAL_KEYS.map((k) => [k, null]));
  return makeFullMrsCheckin(checkinDate, {
    id: `incomplete-${checkinDate}`,
    mrs_complete: false,
    total_score: 0,
    somatic_score: 0,
    psychological_score: 0,
    urogenital_score: 0,
    ...nullMrs,
  });
}

function emptySnapshot(overrides: Partial<CheckinStatusSnapshot> = {}): CheckinStatusSnapshot {
  return {
    recentCheckins: [],
    latestCheckin: null,
    daysLoggedThisMonthCount: 0,
    totalDaysLoggedCount: 0,
    ...overrides,
  };
}

type RowQueryResult = {
  data: SymptomCheckin[] | SymptomCheckin | null;
  error: { code?: string; message: string } | null;
};

type CountQueryResult = {
  count: number | null;
  error: { code?: string; message: string } | null;
};

type QueryKind = 'recent' | 'latest' | 'monthCount' | 'totalCount';

type CapturedQuery = {
  kind: QueryKind;
  userId: string;
  recentStart?: string;
  recentEnd?: string;
  monthStart?: string;
  monthEnd?: string;
  countExactHead?: boolean;
  orderDescending?: boolean;
  limitOne?: boolean;
};

type MockConfig = {
  recent?: RowQueryResult;
  latest?: RowQueryResult;
  monthCount?: CountQueryResult;
  totalCount?: CountQueryResult;
};

function createMockSupabase(
  config: MockConfig,
  onQuery?: (query: CapturedQuery) => void,
) {
  const createBuilder = () => {
    const state: CapturedQuery = {
      kind: 'totalCount',
      userId: '',
      countExactHead: false,
    };

    const resolveRow = (): RowQueryResult => {
      onQuery?.({ ...state });
      if (state.kind === 'recent') {
        return config.recent ?? { data: [], error: null };
      }
      return config.latest ?? { data: null, error: null };
    };

    const resolveCount = (): CountQueryResult => {
      onQuery?.({ ...state });
      if (state.kind === 'monthCount') {
        return config.monthCount ?? { count: 0, error: null };
      }
      return config.totalCount ?? { count: 0, error: null };
    };

    const builder = {
      select(_columns: string, options?: { count?: 'exact'; head?: boolean }) {
        if (options?.count === 'exact' && options.head) {
          state.countExactHead = true;
          state.kind = 'totalCount';
        }
        return builder;
      },
      eq(column: string, value: string) {
        if (column === 'user_id') {
          state.userId = value;
        }
        return builder;
      },
      gte(column: string, value: string) {
        if (column === 'checkin_date') {
          if (state.countExactHead) {
            state.kind = 'monthCount';
            state.monthStart = value;
          } else {
            state.kind = 'recent';
            state.recentStart = value;
          }
        }
        return builder;
      },
      lte(column: string, value: string) {
        if (column === 'checkin_date') {
          if (state.kind === 'monthCount') {
            state.monthEnd = value;
          } else {
            state.recentEnd = value;
          }
        }
        return builder;
      },
      order(_column: string, options: { ascending: boolean }) {
        state.orderDescending = !options.ascending;
        if (state.kind === 'recent') {
          return {
            then<TResult1 = RowQueryResult, TResult2 = never>(
              onfulfilled?: ((value: RowQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              return Promise.resolve(resolveRow()).then(onfulfilled, onrejected);
            },
          };
        }
        return builder;
      },
      limit(_count: number) {
        state.limitOne = true;
        state.kind = 'latest';
        return {
          maybeSingle: () => Promise.resolve(resolveRow()),
        };
      },
      maybeSingle: () => Promise.resolve(resolveRow()),
      then<TResult1 = CountQueryResult, TResult2 = never>(
        onfulfilled?: ((value: CountQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(resolveCount()).then(onfulfilled, onrejected);
      },
    };

    return builder;
  };

  return {
    from: () => createBuilder(),
  };
}

function mockSupabaseClient(
  config: MockConfig,
  onQuery?: (query: CapturedQuery) => void,
) {
  return createMockSupabase(config, onQuery) as never;
}

describe('computeCheckinStatus', () => {
  it('returns due when there are no rows and checkinDay is null', () => {
    const status = computeCheckinStatus(emptySnapshot(), TODAY, null);
    expect(status.isDue).toBe(true);
    expect(status.weeklyMinimumMet).toBe(false);
    expect(status.hasPulseToday).toBe(false);
    expect(status.hasFullMrsToday).toBe(false);
    expect(status).toEqual(EMPTY_CHECKIN_STATUS);
  });

  it('returns not due when a complete full MRS check-in exists today', () => {
    const todayFull = makeFullMrsCheckin(TODAY);
    const status = computeCheckinStatus(
      emptySnapshot({
        recentCheckins: [todayFull],
        latestCheckin: todayFull,
      }),
      TODAY,
      3,
    );
    expect(status.isDue).toBe(false);
    expect(status.hasCheckedInToday).toBe(true);
    expect(status.hasFullMrsToday).toBe(true);
    expect(status.hasPulseToday).toBe(false);
    expect(status.weeklyMinimumMet).toBe(true);
    expect(status.todaysCheckin).toBe(todayFull);
  });

  it('counts a pulse today as checked in today', () => {
    const pulseToday = makePulseCheckin(TODAY);
    const status = computeCheckinStatus(
      emptySnapshot({
        recentCheckins: [pulseToday],
        latestCheckin: pulseToday,
      }),
      TODAY,
      null,
    );
    expect(status.hasCheckedInToday).toBe(true);
    expect(status.hasPulseToday).toBe(true);
    expect(status.hasFullMrsToday).toBe(false);
    expect(status.weeklyMinimumMet).toBe(false);
    expect(status.todaysCheckin).toBe(pulseToday);
  });

  it('does not suppress an otherwise due weekly check-in when only a pulse exists today', () => {
    const pulseToday = makePulseCheckin(TODAY);
    const status = computeCheckinStatus(
      emptySnapshot({
        recentCheckins: [pulseToday],
        latestCheckin: pulseToday,
      }),
      TODAY,
      null,
    );
    expect(status.isDue).toBe(true);
    expect(status.weeklyMinimumMet).toBe(false);
  });

  it('returns not due when a pulse today is paired with a full MRS row one to six days earlier', () => {
    const fullSixDaysAgo = makeFullMrsCheckin(addDaysISO(TODAY, -6));
    const pulseToday = makePulseCheckin(TODAY);
    const status = computeCheckinStatus(
      emptySnapshot({
        recentCheckins: [pulseToday, fullSixDaysAgo],
        latestCheckin: pulseToday,
      }),
      TODAY,
      null,
    );
    expect(status.isDue).toBe(false);
    expect(status.hasCheckedInToday).toBe(true);
    expect(status.hasPulseToday).toBe(true);
    expect(status.hasFullMrsToday).toBe(false);
    expect(status.weeklyMinimumMet).toBe(true);
  });

  it('treats a full MRS row six days earlier as recent', () => {
    const fullSixDaysAgo = makeFullMrsCheckin(addDaysISO(TODAY, -6));
    const status = computeCheckinStatus(
      emptySnapshot({ recentCheckins: [fullSixDaysAgo], latestCheckin: fullSixDaysAgo }),
      TODAY,
      4,
    );
    expect(status.isDue).toBe(false);
    expect(status.weeklyMinimumMet).toBe(true);
  });

  it('does not treat a full MRS row exactly seven days earlier as recent', () => {
    const fullSevenDaysAgo = makeFullMrsCheckin(addDaysISO(TODAY, -7));
    const status = computeCheckinStatus(
      emptySnapshot({ recentCheckins: [], latestCheckin: fullSevenDaysAgo }),
      TODAY,
      null,
    );
    expect(status.isDue).toBe(true);
    expect(status.weeklyMinimumMet).toBe(false);
  });

  it('does not suppress due state for an incomplete MRS row within six days', () => {
    const incomplete = makeIncompleteMrsCheckin(addDaysISO(TODAY, -2));
    const status = computeCheckinStatus(
      emptySnapshot({ recentCheckins: [incomplete], latestCheckin: incomplete }),
      TODAY,
      null,
    );
    expect(status.isDue).toBe(true);
  });

  it('does not suppress due state for a legacy pulse with total_score 0', () => {
    const legacyPulse = makePulseCheckin(addDaysISO(TODAY, -1), { total_score: 0 });
    const status = computeCheckinStatus(
      emptySnapshot({ recentCheckins: [legacyPulse], latestCheckin: legacyPulse }),
      TODAY,
      null,
    );
    expect(status.isDue).toBe(true);
  });

  it('is due with no recent full MRS row and no configured check-in day', () => {
    const status = computeCheckinStatus(emptySnapshot(), TODAY, null);
    expect(status.isDue).toBe(true);
  });

  it('is due when weekly minimum unmet even before the preferred check-in day', () => {
    // TODAY is Wednesday (3); preferred day is Thursday (4) — preference must not suppress due.
    const status = computeCheckinStatus(emptySnapshot(), TODAY, 4);
    expect(status.isDue).toBe(true);
  });

  it('is due on the preferred check-in day when weekly minimum unmet', () => {
    const status = computeCheckinStatus(emptySnapshot(), TODAY, 3);
    expect(status.isDue).toBe(true);
  });

  it('is due after the preferred check-in day when weekly minimum unmet', () => {
    const status = computeCheckinStatus(emptySnapshot(), TODAY, 2);
    expect(status.isDue).toBe(true);
  });

  it('is due Sun–Fri when Saturday is preferred and weekly minimum unmet', () => {
    // Saturday = 6; TODAY Wednesday = 3. Old >= gate stayed silent until Sat.
    const status = computeCheckinStatus(emptySnapshot(), TODAY, 6);
    expect(status.isDue).toBe(true);
  });

  it('uses the most recent row of either type for lastCheckinDate', () => {
    const pulseToday = makePulseCheckin(TODAY);
    const fullYesterday = makeFullMrsCheckin(addDaysISO(TODAY, -1));
    const status = computeCheckinStatus(
      emptySnapshot({
        recentCheckins: [pulseToday, fullYesterday],
        latestCheckin: pulseToday,
      }),
      TODAY,
      null,
    );
    expect(status.lastCheckinDate).toBe(TODAY);
  });

  it('calculates daysSinceLastCheckin from the latest row', () => {
    const fullThreeDaysAgo = makeFullMrsCheckin(addDaysISO(TODAY, -3));
    const status = computeCheckinStatus(
      emptySnapshot({ recentCheckins: [fullThreeDaysAgo], latestCheckin: fullThreeDaysAgo }),
      TODAY,
      null,
    );
    expect(status.daysSinceLastCheckin).toBe(3);
  });

  it('returns null counts when snapshot counts are zero', () => {
    const status = computeCheckinStatus(
      emptySnapshot({ daysLoggedThisMonthCount: 0, totalDaysLoggedCount: 0 }),
      TODAY,
      null,
    );
    expect(status.daysLoggedThisMonth).toBeNull();
    expect(status.totalDaysLogged).toBeNull();
  });

  it('returns positive counts unchanged', () => {
    const status = computeCheckinStatus(
      emptySnapshot({ daysLoggedThisMonthCount: 4, totalDaysLoggedCount: 12 }),
      TODAY,
      null,
    );
    expect(status.daysLoggedThisMonth).toBe(4);
    expect(status.totalDaysLogged).toBe(12);
  });

  it('handles unsorted recent input correctly', () => {
    const older = makeFullMrsCheckin(addDaysISO(TODAY, -5));
    const todayFull = makeFullMrsCheckin(TODAY);
    const status = computeCheckinStatus(
      emptySnapshot({
        recentCheckins: [older, todayFull],
        latestCheckin: todayFull,
      }),
      TODAY,
      4,
    );
    expect(status.hasCheckedInToday).toBe(true);
    expect(status.isDue).toBe(false);
  });

  it('uses the supplied ISO date rather than the machine date', () => {
    const fixedToday = '2020-01-01';
    const fullToday = makeFullMrsCheckin(fixedToday);
    const status = computeCheckinStatus(
      emptySnapshot({ recentCheckins: [fullToday], latestCheckin: fullToday }),
      fixedToday,
      null,
    );
    expect(status.hasCheckedInToday).toBe(true);
    expect(status.lastCheckinDate).toBe(fixedToday);
  });
});

describe('loadCheckinStatusSnapshot', () => {
  it('scopes every query to the provided userId', async () => {
    const queries: CapturedQuery[] = [];
    await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({}, (query) => queries.push(query)),
    });
    expect(queries).toHaveLength(4);
    for (const query of queries) {
      expect(query.userId).toBe(USER_ID);
    }
  });

  it('starts the recent query at today minus six calendar days', async () => {
    const queries: CapturedQuery[] = [];
    await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({}, (query) => queries.push(query)),
    });
    const recent = queries.find((query) => query.kind === 'recent');
    expect(recent?.recentStart).toBe(addDaysISO(TODAY, -6));
  });

  it('ends the recent query at todayStr', async () => {
    const queries: CapturedQuery[] = [];
    await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({}, (query) => queries.push(query)),
    });
    const recent = queries.find((query) => query.kind === 'recent');
    expect(recent?.recentEnd).toBe(TODAY);
  });

  it('orders the latest query descending and limits to one row', async () => {
    const queries: CapturedQuery[] = [];
    await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({}, (query) => queries.push(query)),
    });
    const latest = queries.find((query) => query.kind === 'latest');
    expect(latest?.orderDescending).toBe(true);
    expect(latest?.limitOne).toBe(true);
  });

  it('starts the month count on the first date of the current month', async () => {
    const queries: CapturedQuery[] = [];
    await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({}, (query) => queries.push(query)),
    });
    const monthCount = queries.find((query) => query.kind === 'monthCount');
    expect(monthCount?.monthStart).toBe('2026-07-01');
  });

  it('ends the month count at todayStr', async () => {
    const queries: CapturedQuery[] = [];
    await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({}, (query) => queries.push(query)),
    });
    const monthCount = queries.find((query) => query.kind === 'monthCount');
    expect(monthCount?.monthEnd).toBe(TODAY);
  });

  it('requests exact head-only counts for month and all-time totals', async () => {
    const queries: CapturedQuery[] = [];
    await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({}, (query) => queries.push(query)),
    });
    const monthCount = queries.find((query) => query.kind === 'monthCount');
    const totalCount = queries.find((query) => query.kind === 'totalCount');
    expect(monthCount?.countExactHead).toBe(true);
    expect(totalCount?.countExactHead).toBe(true);
  });

  it('normalizes successful null array data to an empty array', async () => {
    const snapshot = await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({
        recent: { data: null, error: null },
      }),
    });
    expect(snapshot.recentCheckins).toEqual([]);
  });

  it('normalizes successful null counts to zero', async () => {
    const snapshot = await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({
        monthCount: { count: null, error: null },
        totalCount: { count: null, error: null },
      }),
    });
    expect(snapshot.daysLoggedThisMonthCount).toBe(0);
    expect(snapshot.totalDaysLoggedCount).toBe(0);
  });

  it('returns latestCheckin null when no latest row exists', async () => {
    const snapshot = await loadCheckinStatusSnapshot(USER_ID, TODAY, {
      supabaseClient: mockSupabaseClient({
        latest: { data: null, error: null },
      }),
    });
    expect(snapshot.latestCheckin).toBeNull();
  });

  it.each(['recent', 'latest', 'monthCount', 'totalCount'] as const)(
    'rejects the snapshot when %s fails',
    async (failedKind) => {
      const config: MockConfig = {
        recent: { data: [], error: null },
        latest: { data: null, error: null },
        monthCount: { count: 0, error: null },
        totalCount: { count: 0, error: null },
      };
      const error = { code: 'PGRST500', message: `${failedKind} failed` };
      if (failedKind === 'recent') config.recent = { data: null, error };
      if (failedKind === 'latest') config.latest = { data: null, error };
      if (failedKind === 'monthCount') config.monthCount = { count: null, error };
      if (failedKind === 'totalCount') config.totalCount = { count: null, error };

      await expect(
        loadCheckinStatusSnapshot(USER_ID, TODAY, {
          supabaseClient: mockSupabaseClient(config),
        }),
      ).rejects.toThrow('Failed to load check-in status snapshot');
    },
  );
});
