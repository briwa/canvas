# Steps

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## tween

`tween([targets]?, to, { duration, ease, from, stagger })`

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

## move, sequence, parallel, repeat, wait

`move([targets]?, { x, y }, options)` is a `tween` by an offset, and `moveTo` moves `(x0, y0)` to a point. Both also take `(target, i) => ({ x, y })`.

A `parallel` is done when every part that can end has ended.

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

## until

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

## Your own steps

`step([targets]?, { duration, start, update })`

| on `s` | what it is |
| --- | --- |
| `s.targets` | its own targets, or its layer's |
| `s.elapsed` | ms since the step started |
| `s.dt` | ms since the last frame |
| `s.progress` | 0 to 1 through `duration` |
| `s.tween(target, { startAt, duration, from, to, ease })` | schedules a tween inside the step |
| `s.complete()` | ends the step now |

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

