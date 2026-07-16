import { vi } from 'vitest';

vi.stubGlobal(
  'fetch',
  vi.fn(async (input: RequestInfo | URL) => {
    throw new Error(`Unexpected network request during unit tests: ${String(input)}`);
  }),
);
