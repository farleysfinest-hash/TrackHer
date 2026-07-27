import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));

const shared = {
  plugins: [react()],
  resolve: {
    alias: {
      html2canvas: path.resolve(root, 'src/lib/html2canvasStub.ts'),
    },
  },
};

/**
 * Two projects, one command (`npm test`):
 * - unit: fast node (almost everything)
 * - component: jsdom only for `*.test.tsx`
 *
 * Forcing jsdom on the whole suite made full runs ~35s+ and blew Claude's 45s
 * sandbox cap. This keeps component tests without taxing every file.
 */
export default defineConfig({
  ...shared,
  test: {
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'unit-test-anon-key',
    },
    projects: [
      {
        ...shared,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          setupFiles: ['src/test/setup.ts'],
        },
      },
      {
        ...shared,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/test/setup.ts', 'src/test/setup.dom.ts'],
        },
      },
    ],
  },
});
