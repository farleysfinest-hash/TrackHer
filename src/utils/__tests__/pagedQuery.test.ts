import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from '../pagedQuery';

describe('fetchAllPages', () => {
  it('walks until a short page and concatenates', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [1, 2, 3], error: null })
      .mockResolvedValueOnce({ data: [4], error: null });

    const rows = await fetchAllPages(fetchPage, 3);
    expect(rows).toEqual([1, 2, 3, 4]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 3, 5);
  });

  it('stops on an empty first page', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: [], error: null });
    await expect(fetchAllPages(fetchPage, 500)).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledOnce();
  });

  it('throws on the first page error', async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    });
    await expect(fetchAllPages(fetchPage)).rejects.toThrow('boom');
  });
});
