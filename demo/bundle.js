import { resolve } from 'node:path';
import { build } from 'vite';

const ID = 'virtual:canvas-bundle';
const RESOLVED = `\0${ID}`;

export function canvasBundle({ entry = resolve(import.meta.dirname, '../src/index.js') } = {}) {
  return {
    name: 'canvas-bundle',
    resolveId(source) {
      if (source === ID) return RESOLVED;
    },
    async load(id) {
      if (id !== RESOLVED) return;

      const result = await build({
        configFile: false,
        logLevel: 'silent',
        build: {
          write: false,
          minify: false,
          sourcemap: false,
          lib: { entry, name: 'Canvas', formats: ['iife'], fileName: () => 'index.iife.js' },
        },
      });

      const [chunk] = (Array.isArray(result) ? result[0] : result).output;

      for (const file of chunk.moduleIds ?? Object.keys(chunk.modules)) {
        if (!file.startsWith('\0')) this.addWatchFile(file);
      }

      return `export default ${JSON.stringify(chunk.code)};`;
    },
  };
}
