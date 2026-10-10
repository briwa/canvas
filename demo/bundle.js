import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { build } from 'vite';

import { createRenderer } from './render.js';

const LIST = 'virtual:canvas-pages';
const PAGE = 'virtual:canvas-page/';
const SRC = resolve(import.meta.dirname, '../src');

export async function buildCanvas(entry = resolve(SRC, 'index.js')) {
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
  const files = (chunk.moduleIds ?? Object.keys(chunk.modules)).filter((file) => !file.startsWith('\0'));

  return { code: chunk.code, files };
}

export function canvasPages({ dir = import.meta.dirname } = {}) {
  let canvas = null;

  const pages = () =>
    readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => basename(file, '.md'));

  return {
    name: 'canvas-pages',
    resolveId(source) {
      if (source === LIST || source.startsWith(PAGE)) return `\0${source}`;
    },
    async load(id) {
      if (id === `\0${LIST}`) {
        const entries = pages().map((name) => `${JSON.stringify(name)}: () => import(${JSON.stringify(PAGE + name)})`);

        return `export default { ${entries.join(', ')} };`;
      }

      if (!id.startsWith(`\0${PAGE}`)) return;

      const file = resolve(dir, `${id.slice(PAGE.length + 1)}.md`);

      canvas ??= buildCanvas();

      const { code, files } = await canvas;

      for (const watched of [file, ...files]) this.addWatchFile(watched);

      const html = await createRenderer({ bundle: code })(readFileSync(file, 'utf8'));

      return `export default ${JSON.stringify(html)};`;
    },
    configureServer(server) {
      const changed = (file) => {
        if (!file.startsWith(dir) || !file.endsWith('.md')) return;

        const list = server.moduleGraph.getModuleById(`\0${LIST}`);

        if (list) server.moduleGraph.invalidateModule(list);
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('add', changed).on('unlink', changed);
    },
    handleHotUpdate({ file }) {
      if (file.startsWith(SRC)) canvas = null;
    },
  };
}
