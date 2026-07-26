import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'Timeline',
      formats: ['es', 'umd', 'iife'],
      fileName: (format) => {
        if (format === 'es') return 'index.js';
        if (format === 'umd') return 'index.umd.cjs';
        return 'index.iife.js';
      },
    },
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});
