import {
  BaseStep,
  DurationStep,
  Scene,
  Timeline,
  TweenerStep,
  arc,
  circle,
  curve,
  easeInOutSine,
  line,
  linear,
  rect,
} from '../src/index.js';

const TURN = Math.PI * 2;

const INK = { r: 236, g: 232, b: 222 };
const ACCENT = { r: 240, g: 150, b: 96 };
const COOL = { r: 118, g: 176, b: 222 };

function box(x, y, size) {
  const half = size / 2;

  return { x0: x - half, x1: x + half, y0: y - half, y1: y + half };
}

function center(entity) {
  return { x: (entity.x0 + entity.x1) / 2, y: (entity.y0 + entity.y1) / 2 };
}

class To extends TweenerStep {
  constructor({ duration, entities, to, from, ease } = {}) {
    super({ duration, entities });
    this.to = to;
    this.from = from;
    this.ease = ease;
  }

  enter() {
    for (const entity of this.entities) {
      this.tween(entity, {
        startAt: 0,
        duration: this.duration,
        ease: this.ease,
        from: this.from?.(entity),
        to: this.to(entity),
      });
    }
  }
}

class Orbit extends BaseStep {
  constructor({ entities, around, rx, ry = rx, period, phase = 0 } = {}) {
    super({ entities });
    this.around = around;
    this.rx = rx;
    this.ry = ry;
    this.period = period;
    this.phase = phase;
  }

  update(time) {
    super.update(time);

    const angle = this.phase + (this.elapsed / this.period) * TURN;
    const { x, y } = center(this.around);

    for (const entity of this.entities) {
      const half = (entity.x1 - entity.x0) / 2;
      const cx = x + Math.cos(angle) * this.rx;
      const cy = y + Math.sin(angle) * this.ry;

      entity.x0 = cx - half;
      entity.x1 = cx + half;
      entity.y0 = cy - half;
      entity.y1 = cy + half;
    }
  }
}

function logarithmic(k) {
  return (t) => Math.log1p(k * t) / Math.log1p(k);
}

function power(p) {
  return (t) => t ** p;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

class Scribble extends TweenerStep {
  constructor({ duration, entities, from, to, y } = {}) {
    super({ duration, entities });
    this.from = from;
    this.to = to;
    this.y = y;
  }

  enter() {
    const strokes = [];
    let x = this.from;
    let y = this.y;

    this.entities.forEach((stroke, i) => {
      const dx = 18 + Math.random() * 30;
      const ny = this.y + (i % 2 === 0 ? -1 : 1) * (10 + Math.random() * 50);

      stroke.t0 = 0;
      stroke.t1 = 0;

      if (x + dx > this.to) {
        stroke.alpha = 0;
        x = Infinity;
        return;
      }

      stroke.x0 = x;
      stroke.x1 = x + dx;
      stroke.y0 = y;
      stroke.y1 = ny;
      stroke.alpha = 1;
      stroke.ease = pick([
        logarithmic(4 + Math.random() * 40),
        power(2 + Math.random() * 2),
        easeInOutSine,
      ]);

      strokes.push({ stroke, length: Math.hypot(dx, ny - y) });

      x += dx;
      y = ny;
    });

    const total = strokes.reduce((sum, { length }) => sum + length, 0);
    let startAt = 0;

    for (const { stroke, length } of strokes) {
      const duration = (this.duration * length) / total;

      this.tween(stroke, { startAt, duration, ease: linear, to: { t1: 1 } });

      startAt += duration;
    }
  }
}

function orbit(x, y) {
  const path = arc({
    x0: x - 95,
    x1: x + 95,
    y0: y - 45,
    y1: y + 45,
    alpha: 0.2,
    color: INK,
  });
  const sun = circle({ ...box(x, y, 38), color: ACCENT });
  const planet = circle({ ...box(x + 95, y, 18), color: COOL });
  const moon = circle({ ...box(x + 115, y, 7), color: INK });

  return [
    new Timeline({ entities: [path, sun] }),
    new Timeline({
      entities: [planet],
      steps: [new Orbit({ around: sun, rx: 95, ry: 45, period: 6000 })],
    }),
    new Timeline({
      entities: [moon],
      steps: [new Orbit({ around: planet, rx: 20, period: 1400 })],
    }),
  ];
}

function equalizer(x, y, count = 9, width = 16, gap = 6, height = 150) {
  const base = y + height / 2;
  const span = count * width + (count - 1) * gap;
  const left = x - span / 2;
  const floor = line({
    x0: left - 8,
    x1: left + span + 8,
    y0: base + 4,
    y1: base + 4,
    lineWidth: 2,
    alpha: 0.3,
    color: INK,
  });

  const bars = Array.from({ length: count }, (_, i) =>
    rect({
      x0: left + i * (width + gap),
      x1: left + i * (width + gap) + width,
      y0: base - 10,
      y1: base,
      color: {
        r: COOL.r + ((ACCENT.r - COOL.r) * i) / (count - 1),
        g: COOL.g + ((ACCENT.g - COOL.g) * i) / (count - 1),
        b: COOL.b + ((ACCENT.b - COOL.b) * i) / (count - 1),
      },
    }),
  );

  return [
    new Timeline({ entities: [floor] }),
    new Timeline({
      entities: [bars],
      repeat: true,
      steps: [
        new To({
          duration: 240,
          ease: easeInOutSine,
          to: () => ({ y0: base - 12 - Math.random() * (height - 12) }),
        }),
      ],
    }),
  ];
}

function scribble(from, to, y, count = 32) {
  const strokes = Array.from({ length: count }, () => curve({ lineWidth: 3, t1: 0, color: INK }));

  return [
    new Timeline({
      entities: [strokes],
      repeat: true,
      steps: [
        new Scribble({ duration: 2600, from, to, y }),
        new DurationStep({ duration: 900 }),
        new To({ duration: 500, to: () => ({ alpha: 0 }) }),
      ],
    }),
  ];
}

export function start(section) {
  const canvas = section.querySelector('[data-el="stage"]');

  const backdrop = rect({
    x0: 0,
    x1: canvas.width,
    y0: 0,
    y1: canvas.height,
    color: { r: 30, g: 30, b: 40 },
  });

  const cell = canvas.width / 3;
  const middle = canvas.height / 2;

  const scene = new Scene({
    canvas,
    timelines: [
      new Timeline({ entities: [backdrop] }),
      ...equalizer(cell * 0.5, middle),
      ...orbit(cell * 1.5, middle),
      ...scribble(cell * 2 + 24, cell * 3 - 24, middle),
    ],
  });

  let handle = requestAnimationFrame(function frame(time) {
    scene.render(time);
    handle = requestAnimationFrame(frame);
  });

  return () => {
    cancelAnimationFrame(handle);
    scene.destroy();
  };
}
