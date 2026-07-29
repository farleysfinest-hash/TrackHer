import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));

// Hot reload has been crashing Chrome (and Safari) on this chart-heavy app.
// Default: no HMR — save code, then refresh the tab when you want to see it.
// Opt in: TRACKHER_HMR=1 npm run dev
const hmrEnabled = process.env.TRACKHER_HMR === '1';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Only the web app entry — do not scan ios/DerivedData HTML trees.
  optimizeDeps: {
    entries: [path.resolve(root, 'index.html')],
  },
  resolve: {
    // jsPDF lists html2canvas as optional; we only use vector/text PDF drawing,
    // so stub it out instead of shipping ~195KB unused into the app bundle.
    alias: {
      html2canvas: path.resolve(root, 'src/lib/html2canvasStub.ts'),
    },
  },
  server: {
    hmr: hmrEnabled,
    watch: {
      ignored: [
        '**/ios/**',
        '**/android/**',
        '**/dist/**',
        '**/supabase/**',
        '**/.cursor/**',
        '**/.git/**',
        '**/docs/**',
        '**/coverage/**',
        '**/*.md',
      ],
    },
    fs: {
      deny: ['**/ios/DerivedData/**', '**/ios/App/App/public/**'],
    },
  },
});
