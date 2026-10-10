# playground

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## path

Drag the ends and the knots, and change the rest from the figure's settings.

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

const saved = (globalThis.playground ??= { x0: 80, y0: 170, x1: 560, y1: 170, along: [0, 0], across: [0, 0] });
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

## easing

A dot goes from 0 to 1 and back, `ease(progress)` sets where it is, and the marks show where it sits at even steps of time.

```js sandbox=canvas 640x300 code
const { Scene, layer, Entity, path, circle, tween, wait, sequence, repeat, forever, linear } = Canvas;

const name = knob('easeInOutSine', {
  options: ['linear', 'easeInOutSine', 'easeInOutSineInverse', 'easeInSine', 'easeOutSine', 'easeOutLog', 'easeInExpo', 'easeInOutCubic', 'easeOutBack'],
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
  x0: plot.x0, y0: plot.y0, x1: plot.x1, y1: plot.y0,
  segments: 120,
  lineWidth: 3,
  color: INK,
  offset: (t) => ease(t) * (plot.y0 - plot.y1),
});

const axes = [
  path({ x0: plot.x0, y0: plot.y0, x1: plot.x1, y1: plot.y0, lineWidth: 1, color: MUTED }),
  path({ x0: plot.x0, y0: plot.y0, x1: plot.x0, y1: plot.y1, lineWidth: 1, color: MUTED }),
  path({ x0: plot.x0, y0: plot.y0, x1: plot.x1, y1: plot.y1, lineWidth: 1, alpha: 0.5, color: MUTED }),
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

const place = (entity, x, y, r) => Object.assign(entity, { x0: x - r, y0: y - r, x1: x + r, y1: y + r });

const scene = new Scene({
  canvas,
  layers: [
    layer([axes, curve, marks, text(plot.x0, 275, 'progress →'), text(plot.x0 - 30, plot.y1 - 12, 'ease(progress)'), text(track.x0, 110, 'grey: linear, coral: ' + name)]),
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
