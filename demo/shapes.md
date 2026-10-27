# Shapes

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

Every shape is an `Entity`: a box from `(x0, y0)` to `(x1, y1)` with a `draw` function.

```js sandbox=canvas 640x200 control=default code expand
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

## Entity

`new Entity(fields)` → `Entity`

| field | type | default | description |
| --- | --- | --- | --- |
| `x0`, `y0`, `x1`, `y1` | `number` | `0` | Box corners. |
| `color` | `{ r, g, b }` | `{ r: 0, g: 0, b: 0 }` | Fill and stroke colour, 0–255. |
| `alpha` | `number` | `1` | Opacity, 0–1. |
| `lineWidth` | `number` | `1` | Stroke width. |
| `z` | `number` | `0` | Draw order in a scene. Lower goes behind. |
| `draw` | `(ctx, entity) => void` | | Draws the shape. |
| `...rest` | `any` | | Copied onto the entity. Tweenable if numeric. |

| member | returns | description |
| --- | --- | --- |
| `style` | `string` | `color` as a CSS `rgb()` string. |
| `snapshot()` | `object` | Copy of every field. |
| `restore(state)` | `void` | Puts back a snapshot. |

## rect

`rect(fields)` → `Entity`

Filled box. Takes the `Entity` fields.

## circle

`circle(fields)` → `Entity`

Filled ellipse inside the box. Takes the `Entity` fields.

## arc

`arc(fields)` → `Entity`

Outline of the ellipse inside the box. Takes the `Entity` fields, plus:

| field | type | default | description |
| --- | --- | --- | --- |
| `startAngle` | `number` | `0` | Start, in radians. |
| `endAngle` | `number` | `2π` | End, in radians. |

## path

`path(fields)` → `Entity`

Line from `(x0, y0)` to `(x1, y1)`. Takes the `Entity` fields, plus:

| field | type | default | description |
| --- | --- | --- | --- |
| `offset` | `(t, shape) => number \| [along, across]` | `straight` | Push for the point at `t`, in pixels. A number pushes across the line. |
| `ease` | `(t) => number` | `linear` | Eases the y position along the line. |
| `t0` | `number` | `0` | Where drawing starts, 0–1. |
| `t1` | `number` | `1` | Where drawing ends, 0–1. |
| `segments` | `number` | `32` | Line segments for a bent path. |

Drag the ends and the knots, and change the rest from the settings.

```js sandbox=canvas 640x340 code expand
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

## area

`area(fields)` → `Entity`

A `path` filled down to its straight line. Takes the `path` fields, plus:

| field | type | default | description |
| --- | --- | --- | --- |
| `base` | `number` | `0` | Moves the straight edge across, in pixels. |

## rgb

`rgb(color)` → `string`

| parameter | type | description |
| --- | --- | --- |
| `color` | `{ r, g, b }` | Colour, 0–255. |

| returns | |
| --- | --- |
| `string` | CSS `rgb(r g b)`, rounded. |
