import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

vi.stubGlobal(
  'fetch',
  vi.fn(async (input: RequestInfo | URL) => {
    throw new Error(`Unexpected network request during unit tests: ${String(input)}`);
  }),
);
