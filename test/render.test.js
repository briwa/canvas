import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { canvasPages } from '../demo/bundle.js';
import { createRenderer } from '../demo/render.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js';
const page = readFileSync(new URL('../demo/steps.md', import.meta.url), 'utf8');
const count = page.match(/^```js sandbox=canvas/gm).length;

function frames(html) {
  return [...html.matchAll(/srcdoc="([^"]*)"/g)].map(([, doc]) => doc.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
}

describe('docs renderer', () => {
  it('runs every figure on the local build instead of the published one', async () => {
    const html = await createRenderer({ bundle: 'var Canvas = "local build";' })(page);
    const docs = frames(html);

    expect(docs).toHaveLength(count);

    for (const doc of docs) {
      expect(doc).toContain('var Canvas = "local build";');
      expect(doc).not.toContain(`<script src="${CDN}">`);
    }
  });

  it('still shows readers where to load the library from', async () => {
    const html = await createRenderer({ bundle: 'var Canvas = {};' })(page);

    expect(html).toContain(`href="${CDN}"`);
    expect(html.replace(/srcdoc="[^"]*"/g, '')).not.toContain('canvas-local-build');
  });

  it('loads the published library when there is no local build', async () => {
    const docs = frames(await createRenderer()(page));

    for (const doc of docs) expect(doc).toContain(`<script src="${CDN}">`);
  });

  it('lets figures autoplay unless they pick their own control', async () => {
    const markdown = ['```js sandbox=canvas 100x100 code', 'loop(() => {});', '```', '', '```js sandbox=canvas 100x100 control=none code', 'loop(() => {});', '```'].join('\n');
    const html = await createRenderer()(markdown);

    expect(html.match(/data-control="[^"]*"/g)).toEqual(['data-control="autoplay"', 'data-control="none"']);
    expect(await createRenderer({ control: 'hover' })(markdown)).toContain('data-control="hover"');
  });

  it('gives every figure highlighted code behind a toggle', async () => {
    const html = await createRenderer({ bundle: 'var Canvas = {};' })(page);

    const figures = html.split('<figure class="sandbox" ').slice(1);

    expect(figures).toHaveLength(count);
    for (const figure of figures) expect(figure).toContain('class="sandbox-toggle"');
    expect(html).toContain('sbx-tok-keyword');
  });
});

describe('pages', () => {
  it('lists every page and renders each one on the local build', async () => {
    const plugin = canvasPages();
    const watched = [];
    const context = { addWatchFile: (file) => watched.push(file) };

    expect(plugin.resolveId('virtual:canvas-page/steps')).toBe('\0virtual:canvas-page/steps');
    expect(plugin.resolveId('./other.js')).toBeUndefined();

    const list = await plugin.load.call(context, '\0virtual:canvas-pages');

    for (const name of ['getting-started', 'steps', 'scene', 'machine']) {
      expect(list).toContain(`"${name}": () => import("virtual:canvas-page/${name}")`);
    }

    const steps = await plugin.load.call(context, '\0virtual:canvas-page/steps');
    const html = JSON.parse(steps.replace(/^export default /, '').replace(/;$/, ''));

    expect(html).toContain('<h1>Steps</h1>');
    expect(frames(html).every((doc) => doc.includes('var Canvas ='))).toBe(true);
    expect(watched.some((file) => file.endsWith('demo/steps.md'))).toBe(true);
    expect(watched.some((file) => file.endsWith('src/step.js'))).toBe(true);
  });
});
