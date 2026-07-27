/**
 * Paginated PostgREST reads. Supabase's default max rows is 1000 and a truncated
 * page returns 200 with a short array — no error. Walk until a short page.
 */

export const DEFAULT_PAGE_SIZE = 500;

export interface PageQueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export type PageFetcher<T> = (
  from: number,
  to: number,
) => PromiseLike<PageQueryResult<T>>;

/**
 * Walk `.range(from, to)` pages until a short page. Throws on the first error.
 */
export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await fetchPage(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
