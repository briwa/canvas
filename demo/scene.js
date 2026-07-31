import {
  ParallelStep,
  Scene,
  Timeline,
  TweenerStep,
  easeInOutSine,
  lerp,
  linear,
  rect,
} from '../src/index.js';

const canvas = document.getElementById('stage');
const HORIZON = 330;
const BANDS = 6;
const SUN = 34;

const DUSK = { top: { r: 38, g: 32, b: 62 }, low: { r: 216, g: 118, b: 82 } };
const DAWN = { top: { r: 46, g: 56, b: 96 }, low: { r: 196, g: 122, b: 132 } };
const DAY = { top: { r: 78, g: 140, b: 206 }, low: { r: 190, g: 218, b: 238 } };

function mix(from, to, t) {
  return { r: lerp(from.r, to.r, t), g: lerp(from.g, to.g, t), b: lerp(from.b, to.b, t) };
}

class To extends TweenerStep {
  constructor({ duration, entities, to, ease } = {}) {
    super({ duration, entities });
    this.to = to;
    this.ease = ease;
  }

  enter() {
    for (const entity of this.entities) {
      this.tween(entity, {
        startAt: 0,
        duration: this.duration,
        ease: this.ease,
        to: this.to(entity),
      });
    }
  }
}

class Sky extends TweenerStep {
  constructor({ duration, entities, top, low } = {}) {
    super({ duration, entities });
    this.top = top;
    this.low = low;
  }

  enter() {
    const last = Math.max(this.entities.length - 1, 1);

    this.entities.forEach((band, i) => {
      this.tween(band, {
        startAt: 0,
        duration: this.duration,
        ease: linear,
        to: { color: mix(this.top, this.low, i / last) },
      });
    });
  }
}

class Walk extends TweenerStep {
  constructor({ duration, entities, dx, strides = 6, lift = 7 } = {}) {
    super({ duration, entities });
    this.dx = dx;
    this.strides = strides;
    this.lift = lift;
  }

  enter() {
    const beats = this.strides * 2;
    const span = this.duration / beats;

    for (const part of this.entities) {
      this.tween(part, {
        startAt: 0,
        duration: this.duration,
        ease: linear,
        to: { x0: part.x0 + this.dx, x1: part.x1 + this.dx },
      });

      const { y0, y1 } = part;

      for (let i = 0; i < beats; i++) {
        const up = i % 2 === 0;

        this.tween(part, {
          startAt: i * span,
          duration: span,
          ease: easeInOutSine,
          from: { y0: up ? y0 : y0 - this.lift, y1: up ? y1 : y1 - this.lift },
          to: { y0: up ? y0 - this.lift : y0, y1: up ? y1 - this.lift : y1 },
        });
      }
    }
  }
}

function band(i) {
  const height = HORIZON / BANDS;

  return rect({
    x0: 0,
    x1: canvas.width,
    y0: i * height,
    y1: (i + 1) * height + 1,
    color: mix(DUSK.top, DUSK.low, i / (BANDS - 1)),
  });
}

function tree(x, scale) {
  const trunkHeight = 74 * scale;
  const trunkWidth = 13 * scale;
  const leafWidth = 66 * scale;
  const leafHeight = 60 * scale;

  const trunk = rect({
    x0: x - trunkWidth / 2,
    x1: x + trunkWidth / 2,
    y0: HORIZON - trunkHeight,
    y1: HORIZON,
    color: { r: 54, g: 40, b: 34 },
  });

  const canopy = rect({
    x0: x - leafWidth / 2,
    x1: x + leafWidth / 2,
    y0: HORIZON - trunkHeight - leafHeight + 14 * scale,
    y1: HORIZON - trunkHeight + 14 * scale,
    color: { r: 46, g: 98, b: 64 },
  });

  return { trunk, canopy };
}

const bands = Array.from({ length: BANDS }, (_, i) => band(i));

const sun = rect({
  x0: 664,
  x1: 664 + SUN,
  y0: HORIZON + 26,
  y1: HORIZON + 26 + SUN,
  color: { r: 250, g: 226, b: 168 },
});

const ground = rect({
  x0: 0,
  x1: canvas.width,
  y0: HORIZON,
  y1: canvas.height,
  color: { r: 34, g: 50, b: 42 },
});

const trees = [tree(120, 1), tree(310, 0.8), tree(620, 1.1), tree(848, 0.9)];
const trunks = trees.map((t) => t.trunk);
const canopies = trees.map((t) => t.canopy);

const body = rect({
  x0: 60,
  x1: 86,
  y0: HORIZON - 46,
  y1: HORIZON,
  alpha: 0,
  color: { r: 232, g: 98, b: 76 },
});

const head = rect({
  x0: 64,
  x1: 82,
  y0: HORIZON - 66,
  y1: HORIZON - 46,
  alpha: 0,
  color: { r: 246, g: 208, b: 178 },
});

function sky(duration, palette, sunTo) {
  return new ParallelStep([
    new Sky({ duration, entities: bands, ...palette }),
    new To({ duration, entities: [sun], ease: sunTo.ease, to: () => sunTo.to }),
  ]);
}

function sway(dx) {
  return new To({
    duration: 1300,
    entities: canopies,
    ease: easeInOutSine,
    to: (canopy) => ({ x0: canopy.x0 + dx, x1: canopy.x1 + dx }),
  });
}

const scene = new Scene({
  canvas,
  loop: true,
  timelines: [
    new Timeline({
      entities: [bands, sun],
      repeat: true,
      steps: [
        sky(2200, DAWN, { ease: linear, to: { y0: HORIZON - 4, y1: HORIZON - 4 + SUN } }),
        sky(2800, DAY, { ease: easeInOutSine, to: { y0: 68, y1: 68 + SUN } }),
        sky(2800, DUSK, {
          ease: easeInOutSine,
          to: { y0: HORIZON + 26, y1: HORIZON + 26 + SUN },
        }),
      ],
    }),

    new Timeline({
      entities: [ground, trunks, canopies],
      repeat: true,
      steps: [sway(7), sway(-7)],
    }),

    new Timeline({
      entities: [body, head],
      steps: [
        new To({ duration: 700, to: () => ({ alpha: 1 }) }),
        new Walk({ duration: 2500, dx: 330, strides: 7 }),
        new To({
          duration: 260,
          ease: easeInOutSine,
          to: (p) => ({ y0: p.y0 - 42, y1: p.y1 - 42 }),
        }),
        new To({
          duration: 260,
          ease: easeInOutSine,
          to: (p) => ({ y0: p.y0 + 42, y1: p.y1 + 42 }),
        }),
        new Walk({ duration: 2500, dx: 330, strides: 7 }),
        new To({ duration: 700, to: () => ({ alpha: 0 }) }),
      ],
    }),
  ],
});

const loopInput = document.getElementById('loop');

loopInput.addEventListener('change', () => {
  scene.loop = loopInput.checked;
});

document.getElementById('restart').addEventListener('click', () => scene.reset());

requestAnimationFrame(function frame(time) {
  scene.render(time);
  requestAnimationFrame(frame);
});
