import { resolve } from 'node:path';
import { canvasPages } from './demo/bundle.js';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [canvasPages()],
  build: {
    outDir: 'demo-dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'index.html'),
    },
  },
});
