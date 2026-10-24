# Steps

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

A step changes shapes over time. A step without `targets` works on its layer's shapes, or the shapes given to `scene.add` / `scene.run`.

## tween

`tween(targets?, to, options?)` → `Step`

Animates numeric fields to `to`. Start values are read when the step begins.

| parameter | type | default | description |
| --- | --- | --- | --- |
| `targets` | `Entity \| Entity[]` | layer's shapes | Shapes to animate. |
| `to` | `object \| (target, i) => object` | required | End values. Numbers, or objects of numbers (`color`). |
| `options.duration` | `number` | `0` | Length in ms. |
| `options.ease` | `(t) => number` | `easeInOutSine` | Easing function. |
| `options.stagger` | `number` | `0` | Ms between the first and last target's start. |
| `options.from` | `object \| (target, i) => object` | current values | Start values. |

| returns | |
| --- | --- |
| `Step` | Lasts `duration + stagger` ms. |

```js sandbox=canvas 640x220 code
const { Scene, layer, circle, tween, sequence, repeat } = Canvas;

const blue = { r: 118, g: 176, b: 222 };
const coral = { r: 224, g: 122, b: 95 };

const dots = Array.from({ length: 8 }, (_, i) =>
  circle({ x0: 40 + i * 72, y0: 150, x1: 64 + i * 72, y1: 174, color: blue }),
);

const hop = (dy, color) =>
  tween((dot) => ({ y0: dot.y0 + dy, y1: dot.y1 + dy, color }), {
    duration: 500,
    stagger: 400,
  });

const scene = new Scene({
  canvas,
  layers: [layer(dots, repeat(sequence(hop(-100, coral), hop(100, blue))))],
});

loop((t) => scene.render(t));
```

```js sandbox=canvas 960x480 code
const { Scene, layer, rect, tween, sequence, linear } = Canvas;

const BASE = { r: 30, g: 41, b: 59 };
const ACCENT = { r: 244, g: 63, b: 94 };

function tint(h, s, l) {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round((l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return { r: f(0), g: f(8), b: f(4) };
}

const count = 60;
const cols = Math.max(1, Math.round(Math.sqrt(count * (width / height))));
const rows = Math.ceil(count / cols);
const cw = width / cols;
const ch = height / rows;
const pad = Math.min(cw, ch) * 0.12;

const cards = Array.from({ length: count }, (_, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const card = rect({
    x0: col * cw + pad,
    y0: row * ch + pad,
    x1: (col + 1) * cw - pad,
    y1: (row + 1) * ch - pad,
    alpha: 0,
  });
  card.tint = tint((i / count) * 320, 0.7, 0.55);
  return card;
});

const scene = new Scene({
  canvas,
  loop: true,
  layers: [
    layer(
      cards,
      sequence(
        tween((card) => ({ alpha: 1, y0: card.y0, color: card.tint }), {
          duration: 900,
          stagger: 600,
          ease: linear,
          from: (card) => ({ alpha: 0, y0: card.y0 + 24, color: BASE }),
        }),
        tween({ color: ACCENT, alpha: 0.25 }, {
          duration: 900,
          stagger: 600,
          ease: linear,
          from: (card) => ({ color: card.tint, alpha: 1 }),
        }),
      ),
    ),
  ],
});

loop((t) => scene.render(t));
```

## move

`move(targets?, by, options?)` → `Step`

A `tween` that shifts the box by an offset.

| parameter | type | default | description |
| --- | --- | --- | --- |
| `targets` | `Entity \| Entity[]` | layer's shapes | Shapes to move. |
| `by` | `{ x?, y? } \| (target, i) => { x?, y? }` | required | Offset in pixels. |
| `options` | `object` | `{}` | Same as `tween`. |

| returns | |
| --- | --- |
| `Step` | Lasts `duration + stagger` ms. |

## moveTo

`moveTo(targets?, point, options?)` → `Step`

A `tween` that moves `(x0, y0)` to a point, keeping the box's size.

| parameter | type | default | description |
| --- | --- | --- | --- |
| `targets` | `Entity \| Entity[]` | layer's shapes | Shapes to move. |
| `point` | `{ x?, y? } \| (target, i) => { x?, y? }` | required | Where `(x0, y0)` ends up. |
| `options` | `object` | `{}` | Same as `tween`. |

| returns | |
| --- | --- |
| `Step` | Lasts `duration + stagger` ms. |

## sequence

`sequence(...steps)` → `Step`

| parameter | type | description |
| --- | --- | --- |
| `steps` | `Step \| Step[]` | Steps to run one after another. |

| returns | |
| --- | --- |
| `Step` | Finishes when the last step does. |

## parallel

`parallel(...steps)` → `Step`

| parameter | type | description |
| --- | --- | --- |
| `steps` | `Step \| Step[]` | Steps to run at once. |

| returns | |
| --- | --- |
| `Step` | Finishes when every step that can end has ended. |

```js sandbox=canvas 640x220 code
const { Scene, layer, rect, tween, move, wait, sequence, parallel, repeat } = Canvas;

const walker = rect({ x0: 180, y0: 50, x1: 220, y1: 90, color: { r: 224, g: 122, b: 95 } });
const blinker = rect({ x0: 480, y0: 90, x1: 520, y1: 130, color: { r: 118, g: 176, b: 222 } });

const go = (x, y) => move([walker], { x, y }, { duration: 500 });

const scene = new Scene({
  canvas,
  layers: [
    layer(
      [walker, blinker],
      parallel(
        repeat(sequence(go(200, 0), go(0, 80), wait(300), go(-200, 0), go(0, -80), wait(300))),
        repeat(sequence(tween([blinker], { alpha: 0.2 }, { duration: 600 }), tween([blinker], { alpha: 1 }, { duration: 600 }))),
      ),
    ),
  ],
});

loop((t) => scene.render(t));
```

## repeat

`repeat(step, times?)` → `Step`

| parameter | type | default | description |
| --- | --- | --- | --- |
| `step` | `Step` | required | Step to run again each time it ends. |
| `times` | `number` | `Infinity` | How many runs. |

| returns | |
| --- | --- |
| `Step` | Finishes after `times` runs. |

## wait

`wait(duration)` → `Step`

| parameter | type | description |
| --- | --- | --- |
| `duration` | `number` | Ms to do nothing for. |

| returns | |
| --- | --- |
| `Step` | Finishes after `duration`. |

## until

`until(predicate)` → `Step`

| parameter | type | description |
| --- | --- | --- |
| `predicate` | `(s) => boolean` | Checked every frame. |

| returns | |
| --- | --- |
| `Step` | Finishes once `predicate` returns true. |

```js sandbox=canvas 640x200 code
const { Scene, layer, circle, tween, until, sequence, repeat } = Canvas;

const eyes = [250, 390].map((x) =>
  circle({ x0: x - 30, y0: 60, x1: x + 30, y1: 140, color: { r: 118, g: 176, b: 222 } }),
);

const blink = (dy) => tween((e) => ({ y0: e.y0 + dy, y1: e.y1 - dy }), { duration: 90 });

const scene = new Scene({
  canvas,
  layers: [layer(eyes, repeat(sequence(until(() => Math.random() < 0.02), blink(38), blink(-38))))],
});

loop((t) => scene.render(t));
```

## forever

`forever(targets?, update)` → `Step`

| parameter | type | default | description |
| --- | --- | --- | --- |
| `targets` | `Entity \| Entity[]` | layer's shapes | Shapes it works on. |
| `update` | `(s) => void` | required | Called every frame. |

| returns | |
| --- | --- |
| `Step` | Never finishes. |

```js sandbox=canvas 640x200 code
const { Scene, layer, circle, forever } = Canvas;

const sun = circle({ x0: 300, y0: 80, x1: 340, y1: 120, color: { r: 224, g: 122, b: 95 } });
const planet = circle({ x0: 0, y0: 0, x1: 16, y1: 16, color: { r: 118, g: 176, b: 222 } });

const scene = new Scene({
  canvas,
  layers: [
    layer([sun]),
    layer(
      [planet],
      forever((s) => {
        const angle = s.elapsed / 1000;
        const x = 320 + Math.cos(angle) * 160;
        const y = 100 + Math.sin(angle) * 60;

        Object.assign(planet, { x0: x - 8, x1: x + 8, y0: y - 8, y1: y + 8 });
      }),
    ),
  ],
});

loop((t) => scene.render(t));
```

## step

`step(targets?, options)` → `Step`

Makes your own step.

| parameter | type | default | description |
| --- | --- | --- | --- |
| `targets` | `Entity \| Entity[]` | layer's shapes | Shapes it works on. |
| `options.duration` | `number \| null` | `null` | Length in ms. `null` runs until `s.complete()`. |
| `options.start` | `(s) => void` | | Called when the step begins. |
| `options.update` | `(s) => void` | | Called every frame. |

| `s` member | type | description |
| --- | --- | --- |
| `targets` | `Entity[]` | Its own targets, or its layer's. |
| `elapsed` | `number` | Ms since it began. |
| `dt` | `number` | Ms since the last frame. |
| `progress` | `number` | 0–1 through `duration`. |
| `tween(target, { startAt, duration, from, to, ease })` | `Step` | Schedules a tween inside the step. `startAt` is ms from its start. |
| `complete()` | `void` | Ends the step now. |

```js sandbox=canvas 640x200 code
const { Scene, layer, rect, step, wait, sequence, repeat } = Canvas;

function shake({ duration, strength }) {
  let origins;

  return step({
    duration,
    start(s) {
      origins = s.targets.map(({ x0, x1 }) => ({ x0, x1 }));
    },
    update(s) {
      const dx = Math.sin(s.elapsed / 20) * strength * (1 - s.progress);

      s.targets.forEach((target, i) => {
        target.x0 = origins[i].x0 + dx;
        target.x1 = origins[i].x1 + dx;
      });
    },
  });
}

const box = rect({ x0: 280, y0: 60, x1: 360, y1: 140, color: { r: 224, g: 122, b: 95 } });

const scene = new Scene({
  canvas,
  layers: [layer([box], repeat(sequence(wait(800), shake({ duration: 600, strength: 14 }))))],
});

loop((t) => scene.render(t));
```
