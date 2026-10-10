# Getting started

`npm i @briwa.dev/canvas`, or:

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

Figures get `canvas`, `width`, `height` and `loop(fn)`, which calls `fn` with the elapsed ms every frame.

A scene draws layers. A layer holds targets and a step that changes them. Steps inside a layer work on its targets, unless they name their own.

```js sandbox=canvas 640x200 control=default code
const { Scene, layer, circle, tween, sequence, easeInOutSine } = Canvas;

const ball = circle({ x0: 40, y0: 80, x1: 80, y1: 120, color: { r: 224, g: 122, b: 95 } });

const scene = new Scene({
  canvas,
  layers: [
    layer(
      [ball],
      sequence(
        tween({ x0: width - 80, x1: width - 40 }, { duration: 1200, ease: easeInOutSine }),
        tween({ x0: 40, x1: 80 }, { duration: 1200, ease: easeInOutSine }),
      ),
    ),
  ],
});

scene.onFinish(() => reset());

loop((t) => scene.render(t));
```

## Shapes

Every shape sits in a box from `(x0, y0)` to `(x1, y1)`, with `color`, `alpha` and `lineWidth`.

| shape | draws | extra fields |
| --- | --- | --- |
| `rect` | a filled box | |
| `circle` | a filled ellipse inside the box | |
| `arc` | the ellipse's outline, from `startAngle` to `endAngle` | `startAngle`, `endAngle` |
| `path` | a line from `(x0, y0)` to `(x1, y1)`, bent by `offset` and drawn from `t0` to `t1` | `offset`, `ease`, `t0`, `t1`, `segments` |
| `area` | a `path` filled to its straight line, moved `base` pixels | everything `path` takes, and `base` |

`offset(t, shape)` returns the pixels to push the point at `t` sideways, or `[along, across]` to push it along the line too. `spline(values, t)` gives a smooth curve through evenly spaced values, which makes a handy `offset`.

```js sandbox=canvas 640x200 control=default code
const { Scene, layer, Entity, rect, circle, arc, path, area, spline, tween, wait, sequence } = Canvas;

const color = { r: 224, g: 122, b: 95 };
const box = (i) => ({ x0: 20 + i * 105, y0: 60, x1: 100 + i * 105, y1: 140 });

const draw = (to, back) => sequence(tween(to, { duration: 1200 }), wait(800), tween(back, { duration: 1200 }));

const triangle = new Entity({
  ...box(5),
  color,
  draw(ctx, e) {
    ctx.beginPath();
    ctx.moveTo((e.x0 + e.x1) / 2, e.y0);
    ctx.lineTo(e.x1, e.y1);
    ctx.lineTo(e.x0, e.y1);
    ctx.fill();
  },
});

const hill = (t) => 50 * Math.sin(Math.PI * t);

const scene = new Scene({
  canvas,
  layers: [
    layer([rect({ ...box(0), color }), circle({ ...box(1), color })]),
    layer([arc({ ...box(2), lineWidth: 4, endAngle: 0, color })], draw({ endAngle: Math.PI * 2 }, { endAngle: 0 })),
    layer([path({ ...box(3), y0: 140, y1: 60, lineWidth: 4, t1: 0, knots: [0, 16, -16, 16, 0], offset: (t, e) => spline(e.knots, t), color })], draw({ t1: 1 }, { t1: 0 })),
    layer([area({ ...box(4), y0: 110, y1: 110, offset: hill, base: -30, color }), triangle]),
  ],
});

scene.onFinish(() => reset());

loop((t) => scene.render(t));
```

Drag the ends and the knots of this one, and change the rest from its settings.

```js sandbox=canvas 640x340 control=none code
const { Scene, MouseInput, Entity, path, area, circle, rect, spline } = Canvas;

const shape = knob('path', { options: ['path', 'area'] });
const knots = knob(5, { min: 2, max: 12 });
const drag = knob('across', { options: ['across', 'along'] });
const t0 = knob(0, { min: 0, max: 1, step: 0.01 });
const t1 = knob(1, { min: 0, max: 1, step: 0.01 });
const base = knob(-60, { min: -160, max: 160 });

const INK = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const MUTED = { r: 150, g: 158, b: 168 };

const saved = (globalThis.dragged ??= { x0: 80, y0: 170, x1: 560, y1: 170, along: [0, 0], across: [0, 0] });
const resample = (values) => Array.from({ length: knots }, (_, i) => Math.round(spline(values, i / (knots - 1))));

saved.along = resample(saved.along);
saved.across = resample(saved.across);

const { along, across } = saved;
const make = shape === 'area' ? area : path;

const line = make({
  t0, t1, base, along, across,
  segments: 96,
  lineWidth: 4,
  alpha: shape === 'area' ? 0.85 : 1,
  color: INK,
  offset: (t, e) => [spline(e.along, t), spline(e.across, t)],
});

const straight = path({ lineWidth: 1, color: MUTED });
const pins = across.map(() => path({ lineWidth: 1, color: BLUE }));
const dots = across.map(() => circle({ color: BLUE }));
const ends = [rect({ color: MUTED }), rect({ color: MUTED })];

const label = new Entity({
  x0: 16,
  y0: 324,
  color: MUTED,
  draw(ctx, e) {
    ctx.font = '12px monospace';
    ctx.fillText(e.text, e.x0, e.y0);
  },
});

const mouse = new MouseInput();
const scene = new Scene({ canvas, inputs: [mouse] });

scene.add([straight, line, pins, dots, ends, label]);

const frame = () => {
  const dx = saved.x1 - saved.x0;
  const dy = saved.y1 - saved.y0;
  const length = Math.hypot(dx, dy) || 1;

  return { dx, dy, ux: dx / length, uy: dy / length };
};

const knot = (i) => {
  const { dx, dy, ux, uy } = frame();
  const t = i / (knots - 1);
  const bx = saved.x0 + dx * t;
  const by = saved.y0 + dy * t;

  return { bx, by, x: bx + ux * along[i] + uy * across[i], y: by + uy * along[i] - ux * across[i] };
};

const handles = () => [
  { x: saved.x0, y: saved.y0, move: (x, y) => Object.assign(saved, { x0: x, y0: y }) },
  { x: saved.x1, y: saved.y1, move: (x, y) => Object.assign(saved, { x1: x, y1: y }) },
  ...across.map((_, i) => ({
    ...knot(i),
    move(x, y) {
      const { ux, uy } = frame();
      const { bx, by } = knot(i);

      if (drag === 'along') along[i] = Math.round((x - bx) * ux + (y - by) * uy);
      else across[i] = Math.round((x - bx) * uy - (y - by) * ux);
    },
  })),
];

let held = null;

scene.onUpdate(() => {
  if (mouse.pressed) {
    held = handles().find((h) => Math.hypot(h.x - mouse.x, h.y - mouse.y) < 14) ?? null;
  }

  if (mouse.released || !mouse.down) held = null;
  if (held) held.move(Math.round(mouse.x), Math.round(mouse.y));

  const { x0, y0, x1, y1 } = saved;

  Object.assign(line, { x0, y0, x1, y1 });
  Object.assign(straight, { x0, y0, x1, y1 });

  across.forEach((_, i) => {
    const { bx, by, x, y } = knot(i);

    Object.assign(pins[i], { x0: bx, y0: by, x1: x, y1: y });
    Object.assign(dots[i], { x0: x - 6, y0: y - 6, x1: x + 6, y1: y + 6 });
  });

  [[x0, y0], [x1, y1]].forEach(([x, y], i) => Object.assign(ends[i], { x0: x - 6, y0: y - 6, x1: x + 6, y1: y + 6 }));

  label.text = `along: [${along.join(', ')}]   across: [${across.join(', ')}]`;
});

loop((t) => scene.render(t));
onCleanup(() => scene.destroy());
```

## Helpers

`mix(a, b, t)` blends two colours. `polar(origin, angle, length)` is the point `length` away from `origin` at `angle` degrees, where 0 is up.

```js sandbox=canvas 640x200 code
const { Scene, layer, path, forever, mix, polar } = Canvas;

const coral = { r: 224, g: 122, b: 95 };
const blue = { r: 118, g: 176, b: 222 };
const center = { x: width / 2, y: height / 2 };

const ticks = Array.from({ length: 12 }, (_, i) => {
  const from = polar(center, i * 30, 70);
  const to = polar(center, i * 30, 80);

  return path({ x0: from.x, y0: from.y, x1: to.x, y1: to.y, lineWidth: 2, color: blue });
});

const hand = path({ x0: center.x, y0: center.y, x1: center.x, y1: center.y, lineWidth: 4, color: coral });

const scene = new Scene({
  canvas,
  layers: [
    layer([ticks]),
    layer(
      [hand],
      forever((s) => {
        const turn = (s.elapsed / 6000) % 1;
        const end = polar(center, -turn * 360, 64);

        hand.x1 = end.x;
        hand.y1 = end.y;
        hand.color = mix(coral, blue, 1 - Math.abs(1 - turn * 2));
      }),
    ),
  ],
});

loop((t) => scene.render(t));
```
