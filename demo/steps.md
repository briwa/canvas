# Steps

```sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## tween

`tween(targets, to, { duration, ease, from, stagger })`

```sandbox=js viz 640x220 control=auto code
const { Scene, circle, tween, sequence, repeat } = Canvas;

const blue = { r: 118, g: 176, b: 222 };
const coral = { r: 224, g: 122, b: 95 };

const dots = Array.from({ length: 8 }, (_, i) =>
  circle({ x0: 40 + i * 72, y0: 150, x1: 64 + i * 72, y1: 174, color: blue }),
);

const hop = (dy, color) =>
  tween(dots, (dot) => ({ y0: dot.y0 + dy, y1: dot.y1 + dy, color }), {
    duration: 500,
    stagger: 400,
  });

const scene = new Scene({
  canvas,
  entities: dots,
  step: repeat(sequence(hop(-100, coral), hop(100, blue))),
});

loop((t) => scene.render(t));
```

```sandbox=js viz 960x480 control=auto code
const { Scene, rect, tween, sequence, linear } = Canvas;

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
  entities: cards,
  loop: true,
  step: sequence(
    tween(cards, (card) => ({ alpha: 1, y0: card.y0, color: card.tint }), {
      duration: 900,
      stagger: 600,
      ease: linear,
      from: (card) => ({ alpha: 0, y0: card.y0 + 24, color: BASE }),
    }),
    tween(cards, { color: ACCENT, alpha: 0.25 }, {
      duration: 900,
      stagger: 600,
      ease: linear,
      from: (card) => ({ color: card.tint, alpha: 1 }),
    }),
  ),
});

loop((t) => scene.render(t));
```

## sequence, parallel, repeat, wait

A `parallel` is done when every part that can end has ended.

```sandbox=js viz 640x220 control=auto code
const { Scene, rect, tween, wait, sequence, parallel, repeat } = Canvas;

const walker = rect({ x0: 180, y0: 50, x1: 220, y1: 90, color: { r: 224, g: 122, b: 95 } });
const blinker = rect({ x0: 480, y0: 90, x1: 520, y1: 130, color: { r: 118, g: 176, b: 222 } });

const move = (dx, dy) =>
  tween(walker, (e) => ({ x0: e.x0 + dx, x1: e.x1 + dx, y0: e.y0 + dy, y1: e.y1 + dy }), {
    duration: 500,
  });

const scene = new Scene({
  canvas,
  entities: [walker, blinker],
  step: parallel(
    repeat(sequence(move(200, 0), move(0, 80), wait(300), move(-200, 0), move(0, -80), wait(300))),
    repeat(sequence(tween(blinker, { alpha: 0.2 }, { duration: 600 }), tween(blinker, { alpha: 1 }, { duration: 600 }))),
  ),
});

loop((t) => scene.render(t));
```

## until

```sandbox=js viz 640x200 control=auto code
const { Scene, circle, tween, until, sequence, repeat } = Canvas;

const eyes = [250, 390].map((x) =>
  circle({ x0: x - 30, y0: 60, x1: x + 30, y1: 140, color: { r: 118, g: 176, b: 222 } }),
);

const blink = (dy) => tween(eyes, (e) => ({ y0: e.y0 + dy, y1: e.y1 - dy }), { duration: 90 });

const scene = new Scene({
  canvas,
  entities: eyes,
  step: repeat(sequence(until(() => Math.random() < 0.02), blink(38), blink(-38))),
});

loop((t) => scene.render(t));
```

## forever

```sandbox=js viz 640x200 control=auto code
const { Scene, circle, forever } = Canvas;

const sun = circle({ x0: 300, y0: 80, x1: 340, y1: 120, color: { r: 224, g: 122, b: 95 } });
const planet = circle({ x0: 0, y0: 0, x1: 16, y1: 16, color: { r: 118, g: 176, b: 222 } });

const scene = new Scene({
  canvas,
  entities: [sun, planet],
  step: forever((s) => {
    const angle = s.elapsed / 1000;
    const x = 320 + Math.cos(angle) * 160;
    const y = 100 + Math.sin(angle) * 60;

    Object.assign(planet, { x0: x - 8, x1: x + 8, y0: y - 8, y1: y + 8 });
  }),
});

loop((t) => scene.render(t));
```

## Your own steps

`step({ duration, enter, update })`

| on `s` | what it is |
| --- | --- |
| `s.elapsed` | ms since the step started |
| `s.dt` | ms since the last frame |
| `s.progress` | 0 to 1 through `duration` |
| `s.tween(target, { startAt, duration, from, to, ease })` | schedules a tween inside the step |
| `s.complete()` | ends the step now |

```sandbox=js viz 640x200 control=auto code
const { Scene, rect, step, wait, sequence, repeat } = Canvas;

function shake(target, { duration, strength }) {
  let x0;
  let x1;

  return step({
    duration,
    enter() {
      ({ x0, x1 } = target);
    },
    update(s) {
      const dx = Math.sin(s.elapsed / 20) * strength * (1 - s.progress);
      target.x0 = x0 + dx;
      target.x1 = x1 + dx;
    },
  });
}

const box = rect({ x0: 280, y0: 60, x1: 360, y1: 140, color: { r: 224, g: 122, b: 95 } });

const scene = new Scene({
  canvas,
  entities: [box],
  step: repeat(sequence(wait(800), shake(box, { duration: 600, strength: 14 }))),
});

loop((t) => scene.render(t));
```

## All together

```sandbox=js viz 960x320 control=auto code
const { Scene, arc, circle, line, rect, forever, step, tween, wait, sequence, parallel, repeat, easeInOutSine, linear } = Canvas;

const INK = { r: 236, g: 232, b: 222 };
const ACCENT = { r: 240, g: 150, b: 96 };
const COOL = { r: 118, g: 176, b: 222 };

const box = (x, y, size) => ({ x0: x - size / 2, x1: x + size / 2, y0: y - size / 2, y1: y + size / 2 });
const center = (e) => ({ x: (e.x0 + e.x1) / 2, y: (e.y0 + e.y1) / 2 });

function equalizer(x, y, count = 9, w = 16, gap = 6, h = 150) {
  const base = y + h / 2;
  const span = count * w + (count - 1) * gap;
  const left = x - span / 2;
  const floor = line({ x0: left - 8, x1: left + span + 8, y0: base + 4, y1: base + 4, lineWidth: 2, alpha: 0.3, color: INK });
  const bars = Array.from({ length: count }, (_, i) =>
    rect({
      x0: left + i * (w + gap),
      x1: left + i * (w + gap) + w,
      y0: base - 10,
      y1: base,
      color: {
        r: COOL.r + ((ACCENT.r - COOL.r) * i) / (count - 1),
        g: COOL.g + ((ACCENT.g - COOL.g) * i) / (count - 1),
        b: COOL.b + ((ACCENT.b - COOL.b) * i) / (count - 1),
      },
    }),
  );

  return {
    entities: [floor, bars],
    step: repeat(tween(bars, () => ({ y0: base - 12 - Math.random() * (h - 12) }), { duration: 240, ease: easeInOutSine })),
  };
}

function circling(entity, around, { rx, ry = rx, period }) {
  return forever((s) => {
    const angle = (s.elapsed / period) * Math.PI * 2;
    const { x, y } = center(around);
    const half = (entity.x1 - entity.x0) / 2;
    const cx = x + Math.cos(angle) * rx;
    const cy = y + Math.sin(angle) * ry;

    Object.assign(entity, { x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half });
  });
}

function orbit(x, y) {
  const path = arc({ x0: x - 95, x1: x + 95, y0: y - 45, y1: y + 45, alpha: 0.2, color: INK });
  const sun = circle({ ...box(x, y, 38), color: ACCENT });
  const planet = circle({ ...box(x + 95, y, 18), color: COOL });
  const moon = circle({ ...box(x + 115, y, 7), color: INK });

  return {
    entities: [path, sun, planet, moon],
    step: parallel(
      circling(planet, sun, { rx: 95, ry: 45, period: 6000 }),
      circling(moon, planet, { rx: 20, period: 1400 }),
    ),
  };
}

const logarithmic = (k) => (t) => Math.log1p(k * t) / Math.log1p(k);
const power = (p) => (t) => t ** p;
const pick = (items) => items[Math.floor(Math.random() * items.length)];

function scribbling(strokes, { duration, from, to, y: middle }) {
  return step({
    duration,
    enter(s) {
      const drawn = [];
      let x = from;
      let y = middle;

      strokes.forEach((stroke, i) => {
        const dx = 18 + Math.random() * 30;
        const ny = middle + (i % 2 === 0 ? -1 : 1) * (10 + Math.random() * 50);

        stroke.t0 = 0;
        stroke.t1 = 0;

        if (x + dx > to) {
          stroke.alpha = 0;
          x = Infinity;
          return;
        }

        Object.assign(stroke, { x0: x, x1: x + dx, y0: y, y1: ny, alpha: 1 });
        stroke.ease = pick([logarithmic(4 + Math.random() * 40), power(2 + Math.random() * 2), easeInOutSine]);

        drawn.push({ stroke, length: Math.hypot(dx, ny - y) });
        x += dx;
        y = ny;
      });

      const total = drawn.reduce((sum, { length }) => sum + length, 0);
      let startAt = 0;

      for (const { stroke, length } of drawn) {
        const span = (duration * length) / total;
        s.tween(stroke, { startAt, duration: span, ease: linear, to: { t1: 1 } });
        startAt += span;
      }
    },
  });
}

function scribble(from, to, y, count = 32) {
  const strokes = Array.from({ length: count }, () => line({ lineWidth: 3, t1: 0, color: INK }));

  return {
    entities: strokes,
    step: repeat(
      sequence(
        scribbling(strokes, { duration: 2600, from, to, y }),
        wait(900),
        tween(strokes, { alpha: 0 }, { duration: 500 }),
      ),
    ),
  };
}

const backdrop = rect({ x0: 0, x1: width, y0: 0, y1: height, color: { r: 30, g: 30, b: 40 } });
const cell = width / 3;
const parts = [
  equalizer(cell * 0.5, height / 2),
  orbit(cell * 1.5, height / 2),
  scribble(cell * 2 + 24, cell * 3 - 24, height / 2),
];

const scene = new Scene({
  canvas,
  entities: [backdrop, parts.map((part) => part.entities)],
  step: parallel(parts.map((part) => part.step)),
});

loop((t) => scene.render(t));
```
