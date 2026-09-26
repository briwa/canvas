# Getting started

`npm i @briwa.dev/canvas`, or:

```sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

Figures get `canvas`, `width`, `height` and `loop(fn)`, which calls `fn` with the elapsed ms every frame.

A scene draws layers. A layer holds targets and a step that changes them. Steps inside a layer work on its targets, unless they name their own.

```sandbox=js viz 640x200 control=auto code
const { Scene, layer, circle, tween, sequence, repeat, easeInOutSine } = Canvas;

const ball = circle({ x0: 40, y0: 80, x1: 80, y1: 120, color: { r: 224, g: 122, b: 95 } });

const scene = new Scene({
  canvas,
  layers: [
    layer(
      ball,
      repeat(
        sequence(
          tween({ x0: width - 80, x1: width - 40 }, { duration: 1200, ease: easeInOutSine }),
          tween({ x0: 40, x1: 80 }, { duration: 1200, ease: easeInOutSine }),
        ),
      ),
    ),
  ],
});

loop((t) => scene.render(t));
```

## Shapes

Every shape sits in a box from `(x0, y0)` to `(x1, y1)`, with `color`, `alpha` and `lineWidth`.

| shape | draws | extra fields |
| --- | --- | --- |
| `rect` | a filled box | |
| `circle` | a filled ellipse inside the box | |
| `line` | a line from `(x0, y0)` to `(x1, y1)`, bent by `ease`, drawn from `t0` to `t1` | `ease`, `t0`, `t1`, `segments` |
| `arc` | the outline of the ellipse, from `startAngle` to `endAngle` | `startAngle`, `endAngle` |

```sandbox=js viz 640x200 control=auto code
const { Scene, layer, Entity, rect, circle, line, arc, tween, wait, sequence, repeat, easeInOutSine } = Canvas;

const color = { r: 224, g: 122, b: 95 };
const box = (i) => ({ x0: 20 + i * 105, y0: 60, x1: 100 + i * 105, y1: 140 });

const draw = (to, back) =>
  repeat(sequence(tween(to, { duration: 1200 }), wait(800), tween(back, { duration: 1200 })));

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

const scene = new Scene({
  canvas,
  layers: [
    layer([
      rect({ ...box(0), color }),
      circle({ ...box(1), color }),
      line({ ...box(2), y0: 140, y1: 60, lineWidth: 4, color }),
    ]),
    layer(arc({ ...box(3), lineWidth: 4, endAngle: 0, color }), draw({ endAngle: Math.PI * 2 }, { endAngle: 0 })),
    layer(line({ ...box(4), y0: 140, y1: 60, lineWidth: 4, t1: 0, ease: easeInOutSine, color }), draw({ t1: 1 }, { t1: 0 })),
    layer(triangle),
  ],
});

loop((t) => scene.render(t));
```

## Helpers

`mix(a, b, t)` blends two colours. `polar(origin, angle, length)` is the point `length` away from `origin` at `angle` degrees, where 0 is up.

```sandbox=js viz 640x200 control=auto code
const { Scene, layer, line, forever, mix, polar } = Canvas;

const coral = { r: 224, g: 122, b: 95 };
const blue = { r: 118, g: 176, b: 222 };
const center = { x: width / 2, y: height / 2 };

const ticks = Array.from({ length: 12 }, (_, i) => {
  const from = polar(center, i * 30, 70);
  const to = polar(center, i * 30, 80);

  return line({ x0: from.x, y0: from.y, x1: to.x, y1: to.y, lineWidth: 2, color: blue });
});

const hand = line({ x0: center.x, y0: center.y, x1: center.x, y1: center.y, lineWidth: 4, color: coral });

const scene = new Scene({
  canvas,
  layers: [
    layer(ticks),
    layer(
      hand,
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
