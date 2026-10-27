# Rendering

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

A scene only keeps time and calls a `Renderer`. Both can be used without a scene.

## Renderer

`new Renderer(canvas)` → `Renderer`

| member | type | description |
| --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | The canvas. |
| `ctx` | `CanvasRenderingContext2D` | Its 2d context. |
| `clear()` | `void` | Clears the canvas. |
| `render(shapes)` | `void` | Draws `shapes` in order, setting `alpha` and `color` for each. |

```js sandbox=canvas 640x240 control=default code expand
const { Renderer, circle, path, drawRect, polar, mix, easeInOutSine } = Canvas;

const CORAL = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const center = { x: width / 2, y: 110 };

const renderer = new Renderer(canvas);

const dots = Array.from({ length: 6 }, () => circle({ color: { ...CORAL } }));
const arm = path({ x0: center.x, y0: center.y, lineWidth: 2, color: BLUE });

loop((t) => {
  const turn = (t / 4000) * 360;
  const head = polar(center, turn, 70);

  arm.x1 = head.x;
  arm.y1 = head.y;

  dots.forEach((dot, i) => {
    const p = polar(center, turn + i * 60, 70);
    const r = 6 + 6 * easeInOutSine((Math.sin(t / 400 + i) + 1) / 2);

    Object.assign(dot, { x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });
    Object.assign(dot.color, mix(CORAL, BLUE, i / 5));
  });

  renderer.clear();
  renderer.render([arm, ...dots]);

  renderer.ctx.fillStyle = 'rgb(118 176 222)';
  drawRect(renderer.ctx, { x0: 40, y0: 210, x1: 40 + ((t / 4000) % 1) * (width - 80), y1: 216 });
});
```

## Draw functions

`drawX(ctx, shape)` → `void`

Work with any context, and any object with the fields they read. They don't set colour or alpha.

| function | reads |
| --- | --- |
| `drawRect` | `x0`, `y0`, `x1`, `y1` |
| `drawCircle` | `x0`, `y0`, `x1`, `y1` |
| `drawArc` | `x0`, `y0`, `x1`, `y1`, `lineWidth`, `startAngle`, `endAngle` |
| `drawPath` | `x0`, `y0`, `x1`, `y1`, `lineWidth`, `offset`, `ease`, `t0`, `t1`, `segments` |
| `drawArea` | everything `drawPath` reads, and `base` |
| `straight` | — returns `0`; the default `offset` |
