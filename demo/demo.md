# Demo

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## Easing curves

A dot goes from 0 to 1 and back, `ease(progress)` sets where it is, and the marks show where it sits at even steps of time.

```js sandbox=canvas 640x300 code expand
const { Scene, layer, Entity, path, circle, tween, wait, sequence, repeat, forever, linear } =
  Canvas;

const name = knob('easeInOutSine', {
  options: [
    'linear',
    'easeInOutSine',
    'easeInOutSineInverse',
    'easeInSine',
    'easeOutSine',
    'easeOutLog',
    'easeInLog',
    'easeInExpo',
    'easeInOutCubic',
    'easeOutBack',
  ],
});
const duration = knob(1200, { min: 200, max: 4000, step: 100 });
const hold = knob(400, { min: 0, max: 2000, step: 100 });

const ease = Canvas[name];

const INK = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const MUTED = { r: 150, g: 158, b: 168 };

const plot = { x0: 40, y0: 250, x1: 240, y1: 50 };
const track = { x0: 300, x1: 600, y: 150 };

const curve = path({
  x0: plot.x0,
  y0: plot.y0,
  x1: plot.x1,
  y1: plot.y0,
  segments: 120,
  lineWidth: 3,
  color: INK,
  offset: (t) => ease(t) * (plot.y0 - plot.y1),
});

const axes = [
  path({ x0: plot.x0, y0: plot.y0, x1: plot.x1, y1: plot.y0, lineWidth: 1, color: MUTED }),
  path({ x0: plot.x0, y0: plot.y0, x1: plot.x0, y1: plot.y1, lineWidth: 1, color: MUTED }),
  path({
    x0: plot.x0,
    y0: plot.y0,
    x1: plot.x1,
    y1: plot.y1,
    lineWidth: 1,
    alpha: 0.5,
    color: MUTED,
  }),
  path({ x0: track.x0, y0: track.y, x1: track.x1, y1: track.y, lineWidth: 1, color: MUTED }),
];

const marks = Array.from({ length: 21 }, (_, i) => {
  const x = track.x0 + (track.x1 - track.x0) * ease(i / 20);

  return path({ x0: x, y0: track.y + 18, x1: x, y1: track.y + 30, lineWidth: 2, color: BLUE });
});

const dot = (color) => circle({ x0: 0, y0: 0, x1: 0, y1: 0, color });
const onCurve = dot(INK);
const onTrack = dot(INK);
const linearGhost = dot(MUTED);

const text = (x0, y0, value) =>
  new Entity({
    x0,
    y0,
    value,
    color: MUTED,
    draw(ctx, e) {
      ctx.font = '12px monospace';
      ctx.fillText(e.value, e.x0, e.y0);
    },
  });

const readout = text(track.x0, 240, '');
const clock = new Entity({ progress: 0, draw() {} });

const place = (entity, x, y, r) =>
  Object.assign(entity, { x0: x - r, y0: y - r, x1: x + r, y1: y + r });

const scene = new Scene({
  canvas,
  layers: [
    layer([
      axes,
      curve,
      marks,
      text(plot.x0, 275, 'progress →'),
      text(plot.x0 - 30, plot.y1 - 12, 'ease(progress)'),
      text(track.x0, 110, 'grey: linear, coral: ' + name),
    ]),
    layer(
      [clock],
      repeat(
        sequence(
          tween({ progress: 1 }, { duration, ease: linear }),
          wait(hold),
          tween({ progress: 0 }, { duration, ease: linear }),
          wait(hold),
        ),
      ),
    ),
    layer(
      [linearGhost, onCurve, onTrack, readout],
      forever(() => {
        const p = clock.progress;
        const e = ease(p);

        place(onCurve, plot.x0 + (plot.x1 - plot.x0) * p, plot.y0 - (plot.y0 - plot.y1) * e, 6);
        place(onTrack, track.x0 + (track.x1 - track.x0) * e, track.y, 9);
        place(linearGhost, track.x0 + (track.x1 - track.x0) * p, track.y, 6);
        readout.value = `progress ${p.toFixed(2)}   ease ${e.toFixed(2)}`;
      }),
    ),
  ],
});

loop((t) => scene.render(t));
```

## Easing sequence

Chain up to three moves, and watch the speed where one hands over to the next. Turn on `matchSpeed` to pick each later duration so the speed carries over.

```js sandbox=canvas 640x480 control=default code expand
const { Scene, layer, Entity, path, circle, move, step, wait, sequence, forever } = Canvas;

const EASES = [
  'linear',
  'easeInSine',
  'easeOutSine',
  'easeInOutSine',
  'easeOutLog',
  'easeInLog',
  'easeInExpo',
  'easeInOutCubic',
  'easeOutBack',
  'easeInOutSineInverse',
];

const distance1 = knob(100, { min: -300, max: 400, step: 10 });
const duration1 = knob(1000, { min: 100, max: 6000, step: 100 });
const ease1 = knob('easeInSine', { options: EASES });
const leg2 = knob(true);
const distance2 = knob(100, { min: -300, max: 400, step: 10 });
const duration2 = knob(5000, { min: 100, max: 6000, step: 100 });
const ease2 = knob('easeOutLog', { options: EASES });
const leg3 = knob(false);
const distance3 = knob(-40, { min: -300, max: 400, step: 10 });
const duration3 = knob(800, { min: 100, max: 6000, step: 100 });
const ease3 = knob('easeInOutSine', { options: EASES });
const matchSpeed = knob(false);
const drift = knob(false);
const fade = knob(1500, { min: 200, max: 6000, step: 100 });

const INK = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const MUTED = { r: 150, g: 158, b: 168 };
const FRAME = 1000 / 60;

const legs = [
  { distance: distance1, duration: duration1, name: ease1 },
  leg2 && { distance: distance2, duration: duration2, name: ease2 },
  leg3 && { distance: distance3, duration: duration3, name: ease3 },
]
  .filter(Boolean)
  .map((leg) => ({ ...leg, ease: Canvas[leg.name] }));

const H = 1e-4;
const startSpeed = (leg) => ((leg.ease(H) - leg.ease(0)) / H) * (leg.distance / leg.duration);
const endSpeed = (leg) => ((leg.ease(1) - leg.ease(1 - H)) / H) * (leg.distance / leg.duration);

if (matchSpeed) {
  legs.forEach((leg, i) => {
    const before = i && endSpeed(legs[i - 1]);
    const slope = ((leg.ease(H) - leg.ease(0)) / H) * leg.distance;

    if (before && slope / before > 0)
      leg.duration = Math.min(20000, Math.max(16, Math.round(slope / before)));
  });
}

const starts = legs.map((_, i) => legs.slice(0, i).reduce((sum, leg) => sum + leg.duration, 0));
const total = starts.at(-1) + legs.at(-1).duration;
const glide = endSpeed(legs.at(-1));
const span = total + (drift ? 4 * fade : 600);

const position = (time) => {
  let x = 0;

  for (const [i, leg] of legs.entries()) {
    if (time < starts[i] + leg.duration)
      return x + leg.distance * leg.ease(Math.max(0, (time - starts[i]) / leg.duration));
    x += leg.distance;
  }

  return drift ? x + glide * fade * (1 - Math.exp(-(time - total) / fade)) : x;
};

const speed = (time) => (position(time + 0.5) - position(time - 0.5)) * FRAME;

const samples = Array.from({ length: 401 }, (_, i) => (span * i) / 400);
const lowest = Math.min(0, ...samples.map(position));
const highest = Math.max(1, ...samples.map(position));
const fastest = Math.max(0.01, ...samples.map((t) => Math.abs(speed(t))));

const graph = { x0: 40, x1: 600 };
const scale = (graph.x1 - graph.x0) / (highest - lowest);

const plot = (y, value, color) =>
  path({
    x0: graph.x0,
    y0: y,
    x1: graph.x1,
    y1: y,
    segments: 400,
    lineWidth: 2,
    color,
    offset: (t) => value(t * span),
  });

const text = (x0, y0, value, color = MUTED) =>
  new Entity({
    x0,
    y0,
    value,
    color,
    draw(ctx, e) {
      ctx.font = '12px monospace';
      e.value.split('\n').forEach((line, i) => ctx.fillText(line, e.x0, e.y0 + i * 16));
    },
  });

const seams = starts.slice(1).map((time, i) => {
  const x = graph.x0 + ((graph.x1 - graph.x0) * time) / span;
  const from = endSpeed(legs[i]) * FRAME;
  const to = startSpeed(legs[i + 1]) * FRAME;

  return {
    line: path({ x0: x, y0: 90, x1: x, y1: 300, lineWidth: 1, alpha: 0.6, color: BLUE }),
    label: `seam ${i + 1}: ${from.toFixed(2)} → ${to.toFixed(2)} px/frame${Math.abs(from - to) > 0.01 ? '' : ', matched'}`,
  };
});

const code = [
  'sequence(',
  ...legs.map(
    (leg) => `  move({ x: ${leg.distance} }, { duration: ${leg.duration}, ease: ${leg.name} }),`,
  ),
  ...(drift
    ? [`  forever(...), // ${(glide * FRAME).toFixed(2)} px/frame, fading over ${fade}ms`]
    : []),
  ')',
].join('\n');

const dot = circle({
  x0: graph.x0 - lowest * scale - 8,
  y0: 42,
  x1: graph.x0 - lowest * scale + 8,
  y1: 58,
  color: INK,
});
const cursor = path({ x0: graph.x0, y0: 90, x1: graph.x0, y1: 300, lineWidth: 1, color: INK });

const steps = legs.map((leg) =>
  move({ x: leg.distance * scale }, { duration: leg.duration, ease: leg.ease }),
);
const driftStep = forever((s) => {
  const moved = glide * scale * Math.exp(-s.elapsed / fade) * s.dt;

  for (const target of s.targets) {
    target.x0 += moved;
    target.x1 += moved;
  }
});

const scene = new Scene({
  canvas,
  layers: [
    layer([
      path({ x0: graph.x0, y0: 50, x1: graph.x1, y1: 50, lineWidth: 1, color: MUTED }),
      path({ x0: graph.x0, y0: 250, x1: graph.x1, y1: 250, lineWidth: 1, color: MUTED }),
      plot(180, (t) => ((position(t) - lowest) / (highest - lowest)) * 90, INK),
      plot(250, (t) => (speed(t) / fastest) * 45, BLUE),
      seams.map((seam) => seam.line),
      text(graph.x0, 84, 'position'),
      text(graph.x0, 204, 'speed'),
      text(graph.x0, 330, seams.map((seam) => seam.label).join('\n') || 'one move, no seams'),
      text(graph.x0, 400, code),
    ]),
    layer([dot], sequence(...steps, drift ? driftStep : wait(600))),
    layer(
      [cursor],
      step({
        duration: span,
        update(s) {
          cursor.x0 = cursor.x1 =
            graph.x0 + ((graph.x1 - graph.x0) * Math.min(s.elapsed, span)) / span;
        },
      }),
    ),
  ],
});

scene.onFinish(() => reset());

loop((t) => scene.render(t));
```

## A day in the park

Layers, custom steps, `sequence`, `repeat` and `loop: true`.

```js sandbox=canvas 960x480 code expand
const {
  Scene,
  layer,
  circle,
  rect,
  step,
  tween,
  move,
  wait,
  sequence,
  repeat,
  easeInOutSine,
  linear,
  mix,
} = Canvas;

const HORIZON = 330;
const BANDS = 6;
const SUN = 34;

const DUSK = { top: { r: 38, g: 32, b: 62 }, low: { r: 216, g: 118, b: 82 } };
const DAWN = { top: { r: 46, g: 56, b: 96 }, low: { r: 196, g: 122, b: 132 } };
const DAY = { top: { r: 78, g: 140, b: 206 }, low: { r: 190, g: 218, b: 238 } };

function walk({ duration, dx, strides, lift = 7 }) {
  const beats = strides * 2;
  const span = duration / beats;

  return step({
    duration,
    start(s) {
      for (const part of s.targets) {
        s.tween(part, {
          startAt: 0,
          duration,
          ease: linear,
          to: { x0: part.x0 + dx, x1: part.x1 + dx },
        });

        const { y0, y1 } = part;

        for (let i = 0; i < beats; i++) {
          const up = i % 2 === 0;

          s.tween(part, {
            startAt: i * span,
            duration: span,
            ease: easeInOutSine,
            from: { y0: up ? y0 : y0 - lift, y1: up ? y1 : y1 - lift },
            to: { y0: up ? y0 - lift : y0, y1: up ? y1 - lift : y1 },
          });
        }
      }
    },
  });
}

function tree(x, scale) {
  const trunk = rect({
    x0: x - (13 * scale) / 2,
    x1: x + (13 * scale) / 2,
    y0: HORIZON - 74 * scale,
    y1: HORIZON,
    color: { r: 54, g: 40, b: 34 },
  });

  const canopy = circle({
    x0: x - (66 * scale) / 2,
    x1: x + (66 * scale) / 2,
    y0: HORIZON - 74 * scale - 60 * scale + 14 * scale,
    y1: HORIZON - 74 * scale + 14 * scale,
    color: { r: 46, g: 98, b: 64 },
  });

  return { trunk, canopy };
}

const bands = Array.from({ length: BANDS }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: (i * HORIZON) / BANDS,
    y1: ((i + 1) * HORIZON) / BANDS + 1,
    color: mix(DUSK.top, DUSK.low, i / (BANDS - 1)),
  }),
);

const sun = circle({
  x0: 664,
  x1: 664 + SUN,
  y0: HORIZON + 26,
  y1: HORIZON + 26 + SUN,
  color: { r: 250, g: 226, b: 168 },
});
const ground = rect({ x0: 0, x1: width, y0: HORIZON, y1: height, color: { r: 34, g: 50, b: 42 } });

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
const head = circle({
  x0: 64,
  x1: 82,
  y0: HORIZON - 66,
  y1: HORIZON - 46,
  alpha: 0,
  color: { r: 246, g: 208, b: 178 },
});
const hero = [body, head];

const skyTo = ({ top, low }, duration) =>
  tween((_, i) => ({ color: mix(top, low, i / (BANDS - 1)) }), { duration, ease: linear });

const sunTo = (y0, duration, ease) => tween({ y0, y1: y0 + SUN }, { duration, ease });

const sway = (x) => move({ x }, { duration: 1300, ease: easeInOutSine });

const hop = (y) => move({ y }, { duration: 260, ease: easeInOutSine });

const scene = new Scene({
  canvas,
  loop: true,
  layers: [
    layer(bands, repeat(sequence(skyTo(DAWN, 2200), skyTo(DAY, 2800), skyTo(DUSK, 2800)))),
    layer(
      [sun],
      repeat(
        sequence(
          sunTo(HORIZON - 4, 2200, linear),
          sunTo(68, 2800, easeInOutSine),
          sunTo(HORIZON + 26, 2800, easeInOutSine),
        ),
      ),
    ),
    layer([ground, trunks]),
    layer(canopies, repeat(sequence(sway(7), sway(-7)))),
    layer(
      hero,
      sequence(
        tween({ alpha: 1 }, { duration: 700 }),
        walk({ duration: 2500, dx: 330, strides: 7 }),
        hop(-42),
        hop(42),
        walk({ duration: 2500, dx: 330, strides: 7 }),
        wait(2400),
        tween({ alpha: 0 }, { duration: 700 }),
      ),
    ),
  ],
});

loop((t) => scene.render(t));
```

## Machine

A `machine` with keyboard input, spawned acorns and hit tests. Click the figure first. Walk with ← → or A / D, and hop with space, ↑ or W.

```js sandbox=canvas 640x300 code expand
const {
  Scene,
  Entity,
  KeyboardInput,
  machine,
  rect,
  circle,
  step,
  forever,
  tween,
  move,
  wait,
  sequence,
  parallel,
  repeat,
  clamp,
  easeInOutSine,
  linear,
  mix,
  random,
} = Canvas;

const HORIZON = 230;
const JUMP = ['space', 'arrowup', 'w'];
const LEFT = ['arrowleft', 'a'];
const RIGHT = ['arrowright', 'd'];
const SHIRT = { r: 232, g: 98, b: 76 };
const BRUISE = { r: 150, g: 92, b: 160 };

const speed = knob(0.22, { min: 0.05, max: 0.6, step: 0.01 });
const hop = knob(78, { min: 20, max: 160, step: 1 });
const drop = knob(450, { min: 150, max: 1500, step: 10 });

canvas.tabIndex = 0;

const keyboard = new KeyboardInput({ prevent: [...JUMP, ...LEFT, ...RIGHT] });
const scene = new Scene({ canvas, inputs: [keyboard] });

const sky = Array.from({ length: 5 }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: (i * HORIZON) / 5,
    y1: ((i + 1) * HORIZON) / 5 + 1,
    color: mix({ r: 78, g: 140, b: 206 }, { r: 192, g: 220, b: 240 }, i / 4),
  }),
);
const ground = rect({ x0: 0, x1: width, y0: HORIZON, y1: height, color: { r: 34, g: 50, b: 42 } });
const canopy = rect({ x0: 0, x1: width, y0: 0, y1: 26, z: 2, color: { r: 46, g: 98, b: 64 } });

const body = rect({ x0: 300, x1: 326, y0: HORIZON - 44, y1: HORIZON, color: { ...SHIRT } });
const head = circle({
  x0: 304,
  x1: 322,
  y0: HORIZON - 62,
  y1: HORIZON - 44,
  color: { r: 246, g: 208, b: 178 },
});
const hero = [body, head];

const label = new Entity({
  x0: 16,
  y0: height - 24,
  text: '',
  color: { r: 220, g: 232, b: 220 },
  draw: (ctx, e) => {
    ctx.font = '14px ui-monospace, monospace';
    ctx.fillText(e.text, e.x0, e.y0);
  },
});

function drive(s) {
  const dir = keyboard.axis(LEFT, RIGHT);
  if (!dir) return;

  const dx = clamp(dir * speed * s.dt, 8 - body.x0, width - 8 - body.x1);

  for (const part of s.targets) {
    part.x0 += dx;
    part.x1 += dx;
  }
}

function land(m) {
  const dy = HORIZON - body.y1;

  for (const part of m.targets) {
    part.y0 += dy;
    part.y1 += dy;
  }
}

const lift = (y, duration = 260) => move({ y }, { duration, ease: easeInOutSine });
const shake = (x) => move({ x }, { duration: 60, ease: linear });

const jumped = () => keyboard.pressed(...JUMP) && 'jump';
const walking = () => keyboard.axis(LEFT, RIGHT) !== 0;

const brain = machine({
  initial: 'idle',
  states: {
    idle: {
      step: () => repeat(sequence(lift(-3, 600), lift(3, 600))),
      on: () => jumped() || (walking() && 'walk'),
      exit: land,
    },
    walk: {
      step: () => forever(drive),
      on: () => jumped() || (!walking() && 'idle'),
    },
    jump: {
      step: () => parallel(forever(drive), sequence(lift(-hop), lift(hop))),
      done: 'land',
      exit: land,
    },
    land: {
      step: () => sequence(lift(4, 80), lift(-4, 80)),
      done: 'idle',
      exit: land,
    },
    dizzy: {
      step: () =>
        parallel(
          sequence(repeat(sequence(shake(-5), shake(10), shake(-5)), 4), wait(240)),
          tween(body, { color: BRUISE }, { duration: 120 }),
        ),
      exit: () => Object.assign(body.color, SHIRT),
      done: 'idle',
    },
  },
});

const acorns = new Set();

scene.add(sky).add([ground, canopy, label]).add(hero, brain);

scene.every(drop, () => {
  const x = random(20, width - 20);

  const acorn = circle({ x0: x - 6, x1: x + 6, y0: 14, y1: 28, color: { r: 120, g: 78, b: 42 } });

  acorns.add(acorn);
  scene.spawn(
    acorn,
    sequence(
      move({ y: HORIZON - 28 }, { duration: 1600, ease: (p) => p * p }),
      tween({ alpha: 0 }, { duration: 300 }),
    ),
    () => acorns.delete(acorn),
  );
});

scene.onUpdate(() => {
  for (const acorn of acorns) {
    const hit =
      acorn.x1 > head.x0 && acorn.x0 < head.x1 && acorn.y1 > head.y0 && acorn.y0 < body.y1;

    if (hit && acorn.alpha === 1 && !brain.is('dizzy')) {
      acorns.delete(acorn);
      scene.remove(acorn);
      brain.go('dizzy');
    }
  }

  label.text = brain.state;
});

loop((t) => scene.render(t));
onCleanup(() => scene.destroy());
```
