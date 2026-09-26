# Input

```sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

Pass inputs to the scene with `inputs: [...]`, and call `scene.destroy()` to remove the listeners.

## MouseInput

| property | what it is |
| --- | --- |
| `x`, `y` | the pointer, in canvas pixels |
| `inside` | whether the pointer is over the canvas |
| `down` | whether a button is held |
| `pressed`, `released` | true only on the frame it happened |

```sandbox=js viz 460x300 control=none code
const { Scene, MouseInput, arc, circle, rect, step, forever, tween, until, sequence, parallel, repeat, easeInOutSine, lerp } = Canvas;

const HORIZON = 210;
const home = { x: width / 2, y: HORIZON - 92 };
const mix = (a, b, t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });

const bands = Array.from({ length: 5 }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: i * (HORIZON / 5),
    y1: (i + 1) * (HORIZON / 5) + 1,
    color: mix({ r: 24, g: 22, b: 44 }, { r: 104, g: 66, b: 96 }, i / 4),
  }),
);
const ground = rect({ x0: 0, x1: width, y0: HORIZON, y1: height, color: { r: 22, g: 30, b: 30 } });
const trunks = [[66, 0.85], [206, 0.6]].map(([x, s]) =>
  rect({ x0: x - 6 * s, x1: x + 6 * s, y0: HORIZON - 70 * s, y1: HORIZON, color: { r: 44, g: 34, b: 32 } }),
);
const canopies = [[66, 0.85], [206, 0.6]].map(([x, s]) =>
  circle({ x0: x - 30 * s, x1: x + 30 * s, y0: HORIZON - 124 * s + 12 * s, y1: HORIZON - 70 * s + 12 * s, color: { r: 30, g: 60, b: 54 } }),
);

const halo = circle({ x0: home.x - 38, x1: home.x + 38, y0: home.y - 38, y1: home.y + 38, alpha: 0.22, color: { r: 255, g: 178, b: 92 } });
const lantern = circle({ x0: home.x - 8, x1: home.x + 8, y0: home.y - 8, y1: home.y + 8, color: { r: 255, g: 232, b: 172 } });
const ring = arc({ alpha: 0, lineWidth: 3, color: { r: 255, g: 214, b: 160 } });

const mouse = new MouseInput();

function follow(entities, smoothing) {
  let center;
  let offsets;

  return step({
    duration: Infinity,
    enter() {
      const x = entities.reduce((sum, e) => sum + (e.x0 + e.x1) / 2 / entities.length, 0);
      const y = entities.reduce((sum, e) => sum + (e.y0 + e.y1) / 2 / entities.length, 0);

      center = { x, y };
      offsets = entities.map((e) => ({ x0: e.x0 - x, x1: e.x1 - x, y0: e.y0 - y, y1: e.y1 - y }));
    },
    update(s) {
      const aim = mouse.inside ? mouse : home;
      const t = 1 - (1 - smoothing) ** (s.dt / 16);

      center.x = lerp(center.x, aim.x, t);
      center.y = lerp(center.y, aim.y, t);

      entities.forEach((e, i) => {
        e.x0 = center.x + offsets[i].x0;
        e.x1 = center.x + offsets[i].x1;
        e.y0 = center.y + offsets[i].y0;
        e.y1 = center.y + offsets[i].y1;
      });
    },
  });
}

const glow = forever((s) => {
  halo.alpha = lerp(halo.alpha, mouse.down ? 0.55 : 0.22, 1 - 0.86 ** (s.dt / 16));
});

const burst = tween(
  ring,
  () => ({ x0: mouse.x - 70, x1: mouse.x + 70, y0: mouse.y - 70, y1: mouse.y + 70, alpha: 0 }),
  {
    duration: 520,
    ease: easeInOutSine,
    from: () => ({ x0: mouse.x - 5, x1: mouse.x + 5, y0: mouse.y - 5, y1: mouse.y + 5, alpha: 0.6 }),
  },
);

const sway = (dx) =>
  tween(canopies, (c) => ({ x0: c.x0 + dx, x1: c.x1 + dx }), { duration: 1700, ease: easeInOutSine });

const scene = new Scene({
  canvas,
  inputs: [mouse],
  entities: [bands, ground, trunks, canopies, ring, halo, lantern],
  step: parallel(
    repeat(sequence(sway(5), sway(-5))),
    repeat(sequence(until(() => mouse.pressed), burst)),
    follow([halo, lantern], 0.16),
    glow,
  ),
});

loop((t) => scene.render(t));
onCleanup(() => scene.destroy());
```

## KeyboardInput

| method | what it is |
| --- | --- |
| `held(...keys)` | whether any of the keys is down |
| `pressed(...keys)`, `released(...keys)` | true only on the frame it happened |
| `axis(negative, positive)` | `-1`, `0` or `1`, e.g. `axis(['arrowleft'], ['arrowright'])` |
| `keys` | the keys held right now |

Click the figure first. Walk with ← → or A / D, hop with space, ↑ or W.

```sandbox=js viz 460x300 control=none code
const { Scene, KeyboardInput, circle, rect, forever, tween, until, sequence, parallel, repeat, clamp, easeInOutSine, lerp } = Canvas;

const HORIZON = 210;
const JUMP = ['space', 'arrowup', 'w'];
const LEFT = ['arrowleft', 'a'];
const RIGHT = ['arrowright', 'd'];
const mix = (a, b, t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });

canvas.tabIndex = 0;

const bands = Array.from({ length: 5 }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: i * (HORIZON / 5),
    y1: (i + 1) * (HORIZON / 5) + 1,
    color: mix({ r: 78, g: 140, b: 206 }, { r: 192, g: 220, b: 240 }, i / 4),
  }),
);
const ground = rect({ x0: 0, x1: width, y0: HORIZON, y1: height, color: { r: 34, g: 50, b: 42 } });
const trunks = [[66, 0.85], [206, 0.6]].map(([x, s]) =>
  rect({ x0: x - 6 * s, x1: x + 6 * s, y0: HORIZON - 70 * s, y1: HORIZON, color: { r: 44, g: 34, b: 32 } }),
);
const canopies = [[66, 0.85], [206, 0.6]].map(([x, s]) =>
  circle({ x0: x - 30 * s, x1: x + 30 * s, y0: HORIZON - 124 * s + 12 * s, y1: HORIZON - 70 * s + 12 * s, color: { r: 46, g: 98, b: 64 } }),
);

const body = rect({ x0: 40, x1: 66, y0: HORIZON - 44, y1: HORIZON, color: { r: 232, g: 98, b: 76 } });
const head = circle({ x0: 44, x1: 62, y0: HORIZON - 62, y1: HORIZON - 44, color: { r: 246, g: 208, b: 178 } });
const hero = [body, head];

const keyboard = new KeyboardInput({ prevent: [...JUMP, ...LEFT, ...RIGHT] });

const drive = forever((s) => {
  const dir = keyboard.axis(LEFT, RIGHT);
  if (!dir) return;

  const min = Math.min(...hero.map((p) => p.x0));
  const max = Math.max(...hero.map((p) => p.x1));
  const dx = clamp(dir * 0.2 * s.dt, 8 - min, width - 8 - max);

  for (const part of hero) {
    part.x0 += dx;
    part.x1 += dx;
  }
});

const lift = (dy) =>
  tween(hero, (p) => ({ y0: p.y0 + dy, y1: p.y1 + dy }), { duration: 260, ease: easeInOutSine });

const sway = (dx) =>
  tween(canopies, (c) => ({ x0: c.x0 + dx, x1: c.x1 + dx }), { duration: 1700, ease: easeInOutSine });

const scene = new Scene({
  canvas,
  inputs: [keyboard],
  entities: [bands, ground, trunks, canopies, hero],
  step: parallel(
    repeat(sequence(sway(5), sway(-5))),
    drive,
    repeat(sequence(until(() => keyboard.pressed(...JUMP)), lift(-78), lift(78))),
  ),
});

loop((t) => scene.render(t));
onCleanup(() => scene.destroy());
```
