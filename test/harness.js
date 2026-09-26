import { readFileSync } from 'node:fs';
import { findSandboxBlocks } from '@briwa.dev/sandbox';
import { vi } from 'vitest';

import * as library from '../src/index.js';

export const FRAME = 20;

function num(value) {
  const rounded = Math.round(value * 100) / 100;

  return String(Object.is(rounded, -0) ? 0 : rounded);
}

class Context {
  constructor() {
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.globalAlpha = 1;
    this.lineWidth = 1;
    this.stack = [];
    this.path = [];
    this.ops = [];
  }

  save() {
    const { fillStyle, strokeStyle, globalAlpha, lineWidth } = this;

    this.stack.push({ fillStyle, strokeStyle, globalAlpha, lineWidth });
  }

  restore() {
    Object.assign(this, this.stack.pop());
  }

  clearRect(x, y, w, h) {
    this.ops.push(`clear ${[x, y, w, h].map(num).join(' ')}`);
  }

  fillRect(x, y, w, h) {
    this.ops.push(
      `rect ${[x, y, w, h].map(num).join(' ')} | ${this.fillStyle} a=${num(this.globalAlpha)}`,
    );
  }

  beginPath() {
    this.path = [];
  }

  moveTo(x, y) {
    this.path.push(`M${num(x)},${num(y)}`);
  }

  lineTo(x, y) {
    this.path.push(`L${num(x)},${num(y)}`);
  }

  ellipse(...args) {
    this.path.push(`E${args.map(num).join(',')}`);
  }

  fill() {
    this.ops.push(`fill ${this.path.join(' ')} | ${this.fillStyle} a=${num(this.globalAlpha)}`);
  }

  stroke() {
    this.ops.push(
      `stroke ${this.path.join(' ')} | ${this.strokeStyle} a=${num(this.globalAlpha)} w=${num(this.lineWidth)}`,
    );
  }

  take() {
    const ops = this.ops;
    this.ops = [];
    return ops;
  }
}

class Element extends EventTarget {
  constructor(props = {}) {
    super();
    this.textContent = '';
    this.attributes = {};
    Object.assign(this, props);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  click() {
    this.onclick?.();
    this.dispatchEvent(new Event('click'));
  }

}

export class Canvas extends Element {
  constructor(width, height) {
    super({ tagName: 'CANVAS', width, height });
    this.context = new Context();
  }

  getContext(type) {
    return type === '2d' ? this.context : null;
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width, height: this.height };
  }

  fire(type, props = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), props);
    this.dispatchEvent(event);
    return event;
  }
}

function seeded(seed) {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(ops) {
  let h = 0x811c9dc5;
  const text = ops.join('\n');

  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return (h >>> 0).toString(16).padStart(8, '0');
}

export function install({ seed = 1 } = {}) {
  vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
}

export function uninstall() {
  vi.restoreAllMocks();
}

export function find(ops, color) {
  return ops.filter((op) => op.includes(`rgb(${color.r} ${color.g} ${color.b})`));
}

export function parse(op) {
  const [shape, ...rest] = op.split(' | ')[0].split(' ');
  const style = op.split(' | ')[1];
  const alpha = Number(/a=([-\d.]+)/.exec(style)[1]);

  if (shape === 'rect') {
    const [x, y, w, h] = rest.map(Number);
    return { shape, x0: x, y0: y, x1: Number(num(x + w)), y1: Number(num(y + h)), alpha };
  }

  const path = rest.join(' ');
  const ellipse = /E([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)/.exec(path);

  if (ellipse) {
    const [cx, cy, rx, ry] = ellipse.slice(1).map(Number);
    const [x0, x1, y0, y1] = [cx - rx, cx + rx, cy - ry, cy + ry].map((n) => Number(num(n)));
    return { shape, cx, cy, rx, ry, x0, x1, y0, y1, alpha };
  }

  return { shape, path, alpha };
}

class Node extends Element {
  constructor(tag) {
    super({ tagName: tag.toUpperCase(), style: {}, children: [] });
  }

  append(...nodes) {
    this.children.push(...nodes);
  }
}

export function figures(file) {
  const text = readFileSync(new URL(`../demo/${file}`, import.meta.url), 'utf8');

  return findSandboxBlocks(text)
    .filter((block) => block.kind === 'figure')
    .map((block) => {
      const headings = [...text.slice(0, block.from).matchAll(/^#{1,2} (.+)$/gm)];
      return { ...block, heading: headings.at(-1)?.[1] ?? '' };
    });
}

export function figure(file, heading, n = 0) {
  return figures(file).filter((block) => block.heading === heading)[n];
}

export function mount(block) {
  const elements = [];
  const cleanups = [];
  let frame = null;

  const document = {
    createElement(tag) {
      const el = tag === 'canvas' ? new Canvas(300, 150) : new Node(tag);
      elements.push(el);
      return el;
    },
  };

  const surface =
    block.preset === 'canvas'
      ? (() => {
          const canvas = new Canvas(block.w, block.h);
          return { canvas, ctx: canvas.getContext('2d') };
        })()
      : { root: new Node('div') };

  const globals = {
    Canvas: library,
    ...surface,
    width: block.w,
    height: block.h,
    document,
    loop(fn) {
      frame = fn;
      if (block.control !== 'none') fn(block.idle || 0);
      return () => {
        frame = null;
      };
    },
    reset() {},
    onCleanup(fn) {
      cleanups.push(fn);
    },
  };

  new Function(...Object.keys(globals), block.code)(...Object.values(globals));

  const stage = surface.canvas ?? elements.find((el) => el instanceof Canvas);
  stage.context.take();

  return {
    block,
    canvas: stage,
    root: surface.root,
    elements,
    tick(time) {
      frame?.(time);
      return stage.context.take();
    },
    cleanup() {
      for (const fn of cleanups) fn();
      frame = null;
    },
  };
}

export function play(fig, { from = 0, to, each = FRAME, onFrame } = {}) {
  const trace = [];

  for (let time = from; time <= to; time += each) {
    onFrame?.(time);
    trace.push({ time, ops: fig.tick(time) });
  }

  return trace;
}
