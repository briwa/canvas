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
