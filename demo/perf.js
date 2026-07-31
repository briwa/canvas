import { Scene, Timeline, TweenerStep, linear, rect } from '../src/index.js';

const canvas = document.getElementById('stage');

const STAGGER = 600;
const TWEEN = 900;
const BASE = { r: 30, g: 41, b: 59 };
const ACCENT = { r: 244, g: 63, b: 94 };

class Enter extends TweenerStep {
  enter() {
    const stagger = STAGGER / Math.max(this.entities.length - 1, 1);

    this.entities.forEach((entity, i) => {
      this.tween(entity, {
        startAt: i * stagger,
        duration: TWEEN,
        ease: linear,
        from: { alpha: 0, y0: entity.y0 + 24, color: BASE },
        to: { alpha: 1, y0: entity.y0, color: entity.tint },
      });
    });
  }
}

class Shift extends TweenerStep {
  enter() {
    const stagger = STAGGER / Math.max(this.entities.length - 1, 1);

    this.entities.forEach((entity, i) => {
      this.tween(entity, {
        startAt: i * stagger,
        duration: TWEEN,
        ease: linear,
        from: { color: entity.tint, alpha: 1 },
        to: { color: ACCENT, alpha: 0.25 },
      });
    });
  }
}

function tint(h, s, l) {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const v = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255);
  };

  return { r: f(0), g: f(8), b: f(4) };
}

function makeCards(count) {
  const aspect = canvas.width / canvas.height;
  const cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
  const rows = Math.ceil(count / cols);
  const cw = canvas.width / cols;
  const ch = canvas.height / rows;
  const pad = Math.min(cw, ch) * 0.12;
  const cards = [];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const card = rect({
      x0: col * cw + pad,
      y0: row * ch + pad,
      x1: (col + 1) * cw - pad,
      y1: (row + 1) * ch - pad,
      alpha: 0,
    });

    card.tint = tint((i / count) * 320, 0.7, 0.55);
    cards.push(card);
  }

  return cards;
}

const readout = {};
for (const id of [
  'index',
  'step',
  'done',
  'progress',
  'fps',
  'frame',
  'update',
  'render',
  'tweens',
  'settled',
  'frames',
]) {
  readout[id] = document.getElementById(id);
}

const countInput = document.getElementById('count');
const loopInput = document.getElementById('loop');

let cards = [];
let root = null;
let scene = null;

const samples = { frame: [], update: [], render: [] };
const LIMIT = 240;
let frames = 0;
let fpsFrames = 0;
let fpsSince = 0;
let fps = 0;
let last = 0;

function resetStats() {
  samples.frame.length = 0;
  samples.update.length = 0;
  samples.render.length = 0;
  frames = 0;
  fpsFrames = 0;
  fpsSince = 0;
  fps = 0;
  last = 0;
}

function rebuild() {
  cards = makeCards(Number(countInput.value));

  const timeline = new Timeline({
    entities: cards,
    steps: [
      new Enter({ duration: STAGGER + TWEEN }),
      new Shift({ duration: STAGGER + TWEEN }),
    ],
  });

  root = timeline.root;
  scene = new Scene({ canvas, timelines: [timeline], loop: loopInput.checked });

  resetStats();
}

function push(key, value) {
  const list = samples[key];
  list.push(value);
  if (list.length > LIMIT) list.shift();
}

function stats(key) {
  const list = samples[key];
  if (!list.length) return '—';

  let total = 0;
  let max = 0;
  for (const v of list) {
    total += v;
    if (v > max) max = v;
  }

  const sorted = [...list].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];

  return `${(total / list.length).toFixed(2)} / ${p95.toFixed(2)} / ${max.toFixed(2)} ms`;
}

function tweenCounts() {
  const tweens = root.step?.tweener?.tweens;
  if (!tweens) return { total: 0, settled: 0 };

  let settled = 0;
  for (const tween of tweens) if (tween.settled) settled++;

  return { total: tweens.length, settled };
}

let reported = 0;

function report() {
  const step = root.step;
  const { total, settled } = tweenCounts();
  const share = total ? ((settled / total) * 100).toFixed(0) : '0';

  readout.index.textContent = String(root.index);
  readout.step.textContent = root.step ? root.step.constructor.name : 'null';
  readout.done.textContent = String(root.done);
  readout.progress.textContent = step?.duration ? step.progress.toFixed(2) : '—';

  readout.fps.textContent = fps ? fps.toFixed(1) : '—';
  readout.frame.textContent = stats('frame');
  readout.update.textContent = stats('update');
  readout.render.textContent = stats('render');
  readout.tweens.textContent = String(total);
  readout.settled.textContent = `${settled} (${share}%)`;
  readout.frames.textContent = String(frames);
}

function frame(time) {
  const t0 = performance.now();
  scene.advance(time);
  const t1 = performance.now();
  scene.paint();
  const t2 = performance.now();

  if (last) push('frame', time - last);
  last = time;

  push('update', t1 - t0);
  push('render', t2 - t1);
  frames++;

  fpsFrames++;
  if (!fpsSince) fpsSince = time;
  else if (time - fpsSince >= 500) {
    fps = (fpsFrames * 1000) / (time - fpsSince);
    fpsFrames = 0;
    fpsSince = time;
  }

  if (time - reported >= 100) {
    reported = time;
    report();
  }

  if (scene.loop && scene.finished) scene.reset();

  requestAnimationFrame(frame);
}

document.getElementById('restart').addEventListener('click', rebuild);
document.getElementById('reset-stats').addEventListener('click', resetStats);
countInput.addEventListener('change', rebuild);

loopInput.addEventListener('change', () => {
  scene.loop = loopInput.checked;
});

rebuild();
requestAnimationFrame(frame);
