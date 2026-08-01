import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  order: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('../supabase', () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: mocks.order.mockImplementation(() => builder),
    limit: mocks.limit,
  };
  return {
    supabase: {
      from: vi.fn(() => builder),
    },
  };
});

import { loadLunaMessages } from '../lunaConversations';

describe('Luna conversation persistence queries', () => {
  beforeEach(() => {
    mocks.order.mockClear();
    mocks.limit.mockReset();
  });

  it('limits against the newest messages and restores chronological display order', async () => {
    mocks.limit.mockResolvedValue({
      data: [
        { id: 'newest', created_at: '2026-08-01T03:00:00.000Z' },
        { id: 'middle', created_at: '2026-08-01T02:00:00.000Z' },
        { id: 'oldest-in-window', created_at: '2026-08-01T01:00:00.000Z' },
      ],
      error: null,
    });

    const rows = await loadLunaMessages('user-1', 'thread-1');

    expect(mocks.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mocks.limit).toHaveBeenCalledWith(500);
    expect(rows.map((row) => row.id)).toEqual(['oldest-in-window', 'middle', 'newest']);
  });
});
