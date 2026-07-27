import { vi } from 'vitest';

/** Shared by node + jsdom projects. Keep this free of DOM-only imports. */
vi.stubGlobal(
  'fetch',
  vi.fn(async (input: RequestInfo | URL) => {
    throw new Error(`Unexpected network request during unit tests: ${String(input)}`);
  }),
);
