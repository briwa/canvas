import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'Timeline',
      fileName: 'index',
      formats: ['es', 'umd'],
    },
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});
