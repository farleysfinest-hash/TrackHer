import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // jsPDF lists html2canvas as optional; we only use vector/text PDF drawing,
    // so stub it out instead of shipping ~195KB unused into the app bundle.
    alias: {
      html2canvas: path.resolve(root, 'src/lib/html2canvasStub.ts'),
    },
  },
});
