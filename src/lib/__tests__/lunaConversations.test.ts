import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data?: unknown; error?: unknown; count?: number | null };

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  responses: {
    listThreads: null as Result | null,
    messageCount: null as Result | null,
    updateThread: null as Result | null,
    insertThread: null as Result | null,
    loadMessages: null as Result | null,
  },
}));

function chain(
  terminal: () => Promise<Result>,
  options: { resolveAfterEqCalls?: number } = {},
) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  let eqCalls = 0;
  builder.select = vi.fn(self);
  builder.is = vi.fn(self);
  builder.order = vi.fn(self);
  builder.update = vi.fn(self);
  builder.insert = vi.fn(self);
  builder.limit = vi.fn(() => terminal());
  builder.single = vi.fn(() => terminal());
  builder.eq = vi.fn(() => {
    eqCalls += 1;
    if (
      options.resolveAfterEqCalls !== undefined &&
      eqCalls >= options.resolveAfterEqCalls
    ) {
      return terminal();
    }
    return builder;
  });
  return builder;
}

vi.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mocks.from(...args),
  },
}));

import { getOrCreateFocusedLunaThread, loadLunaCrisisState, loadLunaMessages } from '../lunaConversations';

describe('Luna conversation persistence queries', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.responses.listThreads = null;
    mocks.responses.messageCount = null;
    mocks.responses.updateThread = null;
    mocks.responses.insertThread = null;
    mocks.responses.loadMessages = null;
  });

  it('limits against the newest messages and restores chronological display order', async () => {
    mocks.responses.loadMessages = {
      data: [
        { id: 'newest', created_at: '2026-08-01T03:00:00.000Z' },
        { id: 'middle', created_at: '2026-08-01T02:00:00.000Z' },
        { id: 'oldest-in-window', created_at: '2026-08-01T01:00:00.000Z' },
      ],
      error: null,
    };
    const builder = chain(async () => mocks.responses.loadMessages!);
    mocks.from.mockReturnValue(builder);

    const rows = await loadLunaMessages('user-1', 'thread-1');

    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(500);
    expect(rows.map((row) => row.id)).toEqual(['oldest-in-window', 'middle', 'newest']);
  });

  it('does not reuse a preview-null thread that already has a user-only message', async () => {
    const candidate = {
      id: 'thread-user-only',
      user_id: 'user-1',
      kind: 'medication',
      title: 'Old meds ask',
      context_data: {},
      summary: null,
      summary_message_count: 0,
      is_dashboard_primary: false,
      last_message_preview: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    };
    const created = {
      ...candidate,
      id: 'thread-fresh',
      title: 'New labs ask',
      kind: 'lab',
    };

    mocks.responses.listThreads = { data: [candidate], error: null };
    mocks.responses.messageCount = { count: 1, error: null, data: null };
    mocks.responses.insertThread = { data: created, error: null };

    let threadSelects = 0;
    mocks.from.mockImplementation((table: string) => {
      if (table === 'luna_threads') {
        threadSelects += 1;
        if (threadSelects === 1) {
          return chain(async () => mocks.responses.listThreads!);
        }
        return chain(async () => mocks.responses.insertThread!);
      }
      if (table === 'luna_messages') {
        return chain(async () => mocks.responses.messageCount!, {
          resolveAfterEqCalls: 2,
        });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await getOrCreateFocusedLunaThread(
      'user-1',
      'lab',
      'New labs ask',
      { sourceType: 'labs', label: 'Labs' },
    );

    expect(result.id).toBe('thread-fresh');
  });

  it('reuses a preview-null thread only when it has zero messages', async () => {
    const candidate = {
      id: 'thread-empty',
      user_id: 'user-1',
      kind: 'medication',
      title: 'Old title',
      context_data: {},
      summary: null,
      summary_message_count: 0,
      is_dashboard_primary: false,
      last_message_preview: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    };
    const updated = { ...candidate, title: 'Dose watch' };

    mocks.responses.listThreads = { data: [candidate], error: null };
    mocks.responses.messageCount = { count: 0, error: null, data: null };
    mocks.responses.updateThread = { data: updated, error: null };

    let threadSelects = 0;
    mocks.from.mockImplementation((table: string) => {
      if (table === 'luna_threads') {
        threadSelects += 1;
        if (threadSelects === 1) {
          return chain(async () => mocks.responses.listThreads!);
        }
        return chain(async () => mocks.responses.updateThread!);
      }
      if (table === 'luna_messages') {
        return chain(async () => mocks.responses.messageCount!, {
          resolveAfterEqCalls: 2,
        });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await getOrCreateFocusedLunaThread(
      'user-1',
      'medication',
      'Dose watch',
      { sourceType: 'medication', label: 'Dose' },
    );

    expect(result.id).toBe('thread-empty');
    expect(result.title).toBe('Dose watch');
  });
});

describe('loadLunaCrisisState mental_decline leftovers', () => {
  beforeEach(() => {
    mocks.from.mockReset();
  });

  it('clears and ignores leftover mental_decline rows so the panel never mounts', async () => {
    const deleteEq = vi.fn(async () => ({ error: null }));
    const deleteBuilder = {
      delete: vi.fn(() => ({ eq: deleteEq })),
    };
    const selectBuilder = chain(async () => ({
      data: {
        user_id: 'user-1',
        tier: 'mental_decline',
        response_count: 1,
        presented_actions: [],
        asked_questions: [],
        escalated: false,
        last_activity_at: '2026-08-01T00:00:00.000Z',
        expires_at: '2026-08-05T00:00:00.000Z',
      },
      error: null,
    }));

    mocks.from.mockImplementation((table: string) => {
      if (table === 'luna_crisis_state') {
        // First call is select/maybeSingle; subsequent is best-effort delete.
        if (mocks.from.mock.calls.length <= 1) return selectBuilder;
        return deleteBuilder;
      }
      throw new Error(`unexpected table ${table}`);
    });

    // maybeSingle is used by loadLunaCrisisState — add it to the chain helper usage
    selectBuilder.maybeSingle = selectBuilder.single;

    await expect(loadLunaCrisisState('user-1')).resolves.toBeNull();
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});
