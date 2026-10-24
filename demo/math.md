# Math & easing

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## Easing

`ease(progress, ...)` → `number`

Map 0–1 time to 0–1 progress. Pass one as a tween's `ease`. See them plotted in the [demo](#demo).

| function | extra parameter | curve |
| --- | --- | --- |
| `linear` | | constant speed |
| `easeInSine` | | slow start |
| `easeOutSine` | | slow end |
| `easeInOutSine` | | slow start and end; the tween default |
| `easeInOutSineInverse` | | fast start and end |
| `easeInExpo` | | very slow start |
| `easeInOutCubic` | | slow start and end, steeper |
| `easeOutLog` | `strength = 9` | fast start, long tail |
| `easeInLog` | `strength = 9` | long lead-in, fast end |
| `easeOutBack` | `overshoot = 1.70158` | overshoots, then settles |

## lerp

`lerp(from, to, t)` → `number`

| parameter | type | description |
| --- | --- | --- |
| `from`, `to` | `number` | Ends. |
| `t` | `number` | 0 gives `from`, 1 gives `to`. |

## mix

`mix(from, to, t)` → `{ r, g, b }`

| parameter | type | description |
| --- | --- | --- |
| `from`, `to` | `{ r, g, b }` | Colours. |
| `t` | `number` | 0 gives `from`, 1 gives `to`. |

## polar

`polar(origin, angle, length)` → `{ x, y }`

| parameter | type | description |
| --- | --- | --- |
| `origin` | `{ x, y }` | Centre. |
| `angle` | `number` | Degrees. 0 is up, and it turns anticlockwise. |
| `length` | `number` | Distance from `origin`. |

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

## clamp

`clamp(value, min, max)` → `number`

| parameter | type | description |
| --- | --- | --- |
| `value` | `number` | Number to limit. |
| `min`, `max` | `number` | Bounds. |

## spline

`spline(values, t)` → `number`

A smooth curve through evenly spaced values. Handy as a path's `offset`.

| parameter | type | description |
| --- | --- | --- |
| `values` | `number[]` | Values at `t` = 0, …, 1. |
| `t` | `number` | 0–1, clamped. |
