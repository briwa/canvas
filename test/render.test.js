import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createRenderer } from '../demo/render.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js';
const page = readFileSync(new URL('../demo/steps.md', import.meta.url), 'utf8');
const count = page.match(/^```sandbox=js viz/gm).length;

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
    expect(html).not.toContain('canvas-local-build');
  });

  it('loads the published library when there is no local build', async () => {
    const docs = frames(await createRenderer()(page));

    for (const doc of docs) expect(doc).toContain(`<script src="${CDN}">`);
  });

  it('gives every figure highlighted code behind a toggle', async () => {
    const html = await createRenderer({ bundle: 'var Canvas = {};' })(page);

    expect(html.match(/class="sandbox-toggle"/g)).toHaveLength(count);
    expect(html).toContain('sbx-tok-keyword');
  });
});
