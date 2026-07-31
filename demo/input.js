import {
  BaseStep,
  KeyboardInput,
  MouseInput,
  ParallelStep,
  RepeatStep,
  Scene,
  SequenceStep,
  Timeline,
  TweenerStep,
  clamp,
  easeInOutSine,
  lerp,
  rect,
} from '../src/index.js';

const HORIZON = 210;
const BANDS = 5;

const DUSK = {
  top: { r: 24, g: 22, b: 44 },
  low: { r: 104, g: 66, b: 96 },
  ground: { r: 22, g: 30, b: 30 },
  canopy: { r: 30, g: 60, b: 54 },
};

const DAY = {
  top: { r: 78, g: 140, b: 206 },
  low: { r: 192, g: 220, b: 240 },
  ground: { r: 34, g: 50, b: 42 },
  canopy: { r: 46, g: 98, b: 64 },
};

const JUMP = ['space', 'arrowup', 'w'];
const LEFT = ['arrowleft', 'a'];
const RIGHT = ['arrowright', 'd'];

function mix(from, to, t) {
  return { r: lerp(from.r, to.r, t), g: lerp(from.g, to.g, t), b: lerp(from.b, to.b, t) };
}

class Sway extends TweenerStep {
  constructor({ duration, entities, dx } = {}) {
    super({ duration, entities });
    this.dx = dx;
  }

  enter() {
    for (const canopy of this.entities) {
      this.tween(canopy, {
        startAt: 0,
        duration: this.duration,
        ease: easeInOutSine,
        to: { x0: canopy.x0 + this.dx, x1: canopy.x1 + this.dx },
      });
    }
  }
}

class WaitFor extends BaseStep {
  constructor({ entities, when } = {}) {
    super({ entities });
    this.when = when;
  }

  update(time) {
    super.update(time);

    if (this.input && this.when(this.input)) this.complete();
  }
}

class Follow extends BaseStep {
  constructor({ entities, home, smoothing = 0.16 } = {}) {
    super({ entities });
    this.home = home;
    this.smoothing = smoothing;
  }

  enter() {
    let x = 0;
    let y = 0;

    for (const entity of this.entities) {
      x += (entity.x0 + entity.x1) / 2 / this.entities.length;
      y += (entity.y0 + entity.y1) / 2 / this.entities.length;
    }

    this.center = { x, y };
    this.offsets = this.entities.map((entity) => ({
      x0: entity.x0 - x,
      x1: entity.x1 - x,
      y0: entity.y0 - y,
      y1: entity.y1 - y,
    }));
  }

  update(time) {
    const dt = time - this.time;
    super.update(time);

    const aim = this.input?.inside ? this.input : this.home;
    const t = 1 - (1 - this.smoothing) ** (dt / 16);

    this.center.x = lerp(this.center.x, aim.x, t);
    this.center.y = lerp(this.center.y, aim.y, t);

    this.entities.forEach((entity, i) => {
      const offset = this.offsets[i];

      entity.x0 = this.center.x + offset.x0;
      entity.x1 = this.center.x + offset.x1;
      entity.y0 = this.center.y + offset.y0;
      entity.y1 = this.center.y + offset.y1;
    });
  }
}

class Glow extends BaseStep {
  constructor({ entities, dim = 0.22, lit = 0.55 } = {}) {
    super({ entities });
    this.dim = dim;
    this.lit = lit;
  }

  update(time) {
    const dt = time - this.time;
    super.update(time);

    const to = this.input?.down ? this.lit : this.dim;
    const t = 1 - 0.86 ** (dt / 16);

    for (const entity of this.entities) {
      entity.alpha = lerp(entity.alpha, to, t);
    }
  }
}

class Burst extends TweenerStep {
  constructor({ duration, entities, size = 130 } = {}) {
    super({ duration, entities });
    this.size = size;
  }

  enter() {
    const x = this.input?.x ?? 0;
    const y = this.input?.y ?? 0;
    const half = this.size / 2;

    for (const entity of this.entities) {
      this.tween(entity, {
        startAt: 0,
        duration: this.duration,
        ease: easeInOutSine,
        from: { x0: x - 5, x1: x + 5, y0: y - 5, y1: y + 5, alpha: 0.6 },
        to: { x0: x - half, x1: x + half, y0: y - half, y1: y + half, alpha: 0 },
      });
    }
  }
}

class Drive extends BaseStep {
  constructor({ entities, speed = 0.2, bounds } = {}) {
    super({ entities });
    this.speed = speed;
    this.bounds = bounds;
  }

  update(time) {
    const dt = time - this.time;
    super.update(time);

    const dir = this.input?.axis(LEFT, RIGHT) ?? 0;
    if (!dir) return;

    let min = Infinity;
    let max = -Infinity;

    for (const part of this.entities) {
      min = Math.min(min, part.x0);
      max = Math.max(max, part.x1);
    }

    const dx = clamp(dir * this.speed * dt, this.bounds.x0 - min, this.bounds.x1 - max);

    for (const part of this.entities) {
      part.x0 += dx;
      part.x1 += dx;
    }
  }
}

class Hop extends TweenerStep {
  constructor({ duration, entities, lift = 78 } = {}) {
    super({ duration, entities });
    this.lift = lift;
  }

  enter() {
    const half = this.duration / 2;

    for (const part of this.entities) {
      const { y0, y1 } = part;

      this.tween(part, {
        startAt: 0,
        duration: half,
        ease: easeInOutSine,
        to: { y0: y0 - this.lift, y1: y1 - this.lift },
      });

      this.tween(part, {
        startAt: half,
        duration: half,
        ease: easeInOutSine,
        from: { y0: y0 - this.lift, y1: y1 - this.lift },
        to: { y0, y1 },
      });
    }
  }
}

function tree(x, scale, canopyColor) {
  const trunkHeight = 70 * scale;
  const trunkWidth = 12 * scale;
  const leafWidth = 60 * scale;
  const leafHeight = 54 * scale;

  const trunk = rect({
    x0: x - trunkWidth / 2,
    x1: x + trunkWidth / 2,
    y0: HORIZON - trunkHeight,
    y1: HORIZON,
    color: { r: 44, g: 34, b: 32 },
  });

  const canopy = rect({
    x0: x - leafWidth / 2,
    x1: x + leafWidth / 2,
    y0: HORIZON - trunkHeight - leafHeight + 12 * scale,
    y1: HORIZON - trunkHeight + 12 * scale,
    color: canopyColor,
  });

  return { trunk, canopy };
}

function scenery(canvas, palette) {
  const height = HORIZON / BANDS;

  const bands = Array.from({ length: BANDS }, (_, i) =>
    rect({
      x0: 0,
      x1: canvas.width,
      y0: i * height,
      y1: (i + 1) * height + 1,
      color: mix(palette.top, palette.low, i / (BANDS - 1)),
    }),
  );

  const ground = rect({
    x0: 0,
    x1: canvas.width,
    y0: HORIZON,
    y1: canvas.height,
    color: palette.ground,
  });

  const trees = [tree(66, 0.85, palette.canopy), tree(206, 0.6, palette.canopy)];
  const trunks = trees.map((t) => t.trunk);
  const canopies = trees.map((t) => t.canopy);

  return new Timeline({
    entities: [bands, ground, trunks, canopies],
    repeat: true,
    steps: [
      new Sway({ duration: 1700, entities: canopies, dx: 5 }),
      new Sway({ duration: 1700, entities: canopies, dx: -5 }),
    ],
  });
}

const mouseCanvas = document.getElementById('mouse-stage');
const keyboardCanvas = document.getElementById('keyboard-stage');

const home = { x: mouseCanvas.width / 2, y: HORIZON - 92 };

const glow = rect({
  x0: home.x - 38,
  x1: home.x + 38,
  y0: home.y - 38,
  y1: home.y + 38,
  alpha: 0.22,
  color: { r: 255, g: 178, b: 92 },
});

const lantern = rect({
  x0: home.x - 8,
  x1: home.x + 8,
  y0: home.y - 8,
  y1: home.y + 8,
  color: { r: 255, g: 232, b: 172 },
});

const burst = rect({ alpha: 0, color: { r: 255, g: 214, b: 160 } });

const mouse = new MouseInput();

const mouseScene = new Scene({
  canvas: mouseCanvas,
  input: mouse,
  timelines: [
    scenery(mouseCanvas, DUSK),

    new Timeline({
      entities: [burst],
      repeat: true,
      steps: [
        new WaitFor({ when: (input) => input.pressed }),
        new Burst({ duration: 520, size: 140 }),
      ],
    }),

    new Timeline({
      entities: [glow, lantern],
      steps: [
        new ParallelStep([
          new Follow({ home, smoothing: 0.16 }),
          new Glow({ entities: [glow], dim: 0.22, lit: 0.55 }),
        ]),
      ],
    }),
  ],
});

const body = rect({
  x0: 40,
  x1: 66,
  y0: HORIZON - 44,
  y1: HORIZON,
  color: { r: 232, g: 98, b: 76 },
});

const head = rect({
  x0: 44,
  x1: 62,
  y0: HORIZON - 62,
  y1: HORIZON - 44,
  color: { r: 246, g: 208, b: 178 },
});

const keyboard = new KeyboardInput({ prevent: [...JUMP, ...LEFT, ...RIGHT] });

const keyboardScene = new Scene({
  canvas: keyboardCanvas,
  input: keyboard,
  timelines: [
    scenery(keyboardCanvas, DAY),

    new Timeline({
      entities: [body, head],
      steps: [
        new ParallelStep([
          new Drive({ speed: 0.2, bounds: { x0: 8, x1: keyboardCanvas.width - 8 } }),
          new RepeatStep(
            new SequenceStep([
              new WaitFor({ when: (input) => input.pressed(...JUMP) }),
              new Hop({ duration: 520, lift: 78 }),
            ]),
          ),
        ]),
      ],
    }),
  ],
});

keyboardCanvas.focus();

const readout = {
  pointer: document.getElementById('pointer'),
  inside: document.getElementById('inside'),
  down: document.getElementById('down'),
  presses: document.getElementById('presses'),
  focused: document.getElementById('focused'),
  keys: document.getElementById('keys'),
  axis: document.getElementById('axis'),
  hops: document.getElementById('hops'),
};

let presses = 0;
let hops = 0;

document.getElementById('restart').addEventListener('click', () => {
  mouseScene.reset();
  keyboardScene.reset();

  presses = 0;
  hops = 0;
});

requestAnimationFrame(function frame(time) {
  if (mouse.pressed) presses++;
  if (keyboard.pressed(...JUMP)) hops++;

  mouseScene.render(time);
  keyboardScene.render(time);

  readout.pointer.textContent = `${Math.round(mouse.x)}, ${Math.round(mouse.y)}`;
  readout.inside.textContent = String(mouse.inside);
  readout.down.textContent = String(mouse.down);
  readout.presses.textContent = String(presses);
  readout.focused.textContent = String(document.activeElement === keyboardCanvas);
  readout.keys.textContent = keyboard.keys.size ? [...keyboard.keys].join(' ') : '—';
  readout.axis.textContent = String(keyboard.axis(LEFT, RIGHT));
  readout.hops.textContent = String(hops);

  requestAnimationFrame(frame);
});
