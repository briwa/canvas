import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';

const DIR = import.meta.dirname;
const FENCE = /^```js\b([^\n]*)\n([\s\S]*?)^```$/gm;

const check = process.argv.includes('--check');
const stale = [];

for (const name of readdirSync(DIR).filter((file) => file.endsWith('.md'))) {
  const file = resolve(DIR, name);
  const text = readFileSync(file, 'utf8');
  const options = { ...(await resolveConfig(file)), parser: 'babel' };

  let out = '';
  let last = 0;

  for (const match of text.matchAll(FENCE)) {
    const [whole, info, code] = match;
    const formatted = await format(code, options);

    out += text.slice(last, match.index) + '```js' + info + '\n' + formatted + '```';
    last = match.index + whole.length;
  }

  out += text.slice(last);

  if (out === text) continue;

  stale.push(name);

  if (!check) writeFileSync(file, out);
}

if (stale.length) console.log(`${check ? 'Needs formatting' : 'Formatted'}: ${stale.join(', ')}`);
if (check && stale.length) process.exit(1);
