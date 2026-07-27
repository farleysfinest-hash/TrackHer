/**
 * Paginated PostgREST reads.
 *
 * Hosted Supabase defaults to max 1000 rows per request (API settings → Max rows). That is
 * still the platform default — it is not unlimited unless you raised it in the dashboard.
 * This repo's local `supabase/config.toml` also sets `max_rows = 1000`. A truncated page
 * returns HTTP 200 with a short array and no error, so walks until a short page.
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
